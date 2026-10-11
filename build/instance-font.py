#!/usr/bin/env python3
"""Write one file by weight of a role from the variable font of the role.

    python build/instance-font.py <variable.ttf> <output.ttf> <axis>=<value> [<axis>=<value> ...]

The font is written as it is at the values that are given, such as `wght=600`, and at the
default of every axis that is not named, such as the optical size. The result has no axis.
It keeps every glyph, every character and every layout feature of the variable font, and its
metrics at those values.

The names of the result are those the `STAT` table of the variable font gives the values:
`Inter SemiBold Italic`. The PostScript name is the family and the style without spaces,
`Inter-SemiBoldItalic`, as a download of the family by weight has it; an iOS app loads a
font by that name. An optical size that the table names, such as `18pt`, is a part of the
family and not of the style, as in such a download: `DM Sans 18pt`, `DMSans18pt-SemiBold`.
The dates of the font are kept, so the same command on the same file writes the same bytes.

This is a step of docs/fonts.md, run by hand when the fonts of a brand change, and no part
of the build. It needs the package fonttools, which the build does not.
"""

import sys

try:
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
except ImportError:
    sys.exit("This script needs the package fonttools: pip install fonttools")

WINDOWS_ENGLISH = (3, 1, 0x409)


def english(font, name_id):
    """An entry of the name table, in the English of Windows, or nothing."""
    record = font["name"].getName(name_id, *WINDOWS_ENGLISH)
    return record.toUnicode() if record else None


def rename(font, name_id, value):
    """Give an entry of the name table a value in every language it has, or remove it."""
    records = [record for record in font["name"].names if record.nameID == name_id]
    if value is None:
        font["name"].removeNames(nameID=name_id)
    elif not records:
        font["name"].setName(value, name_id, *WINDOWS_ENGLISH)
    for record in records if value is not None else []:
        record.string = value


def cut_of(font, limits):
    """The name the STAT table gives the optical size a font is fixed at, such as `18pt`,
    or nothing for a font without the axis and for a size the table leaves out of a name."""
    if "opsz" not in limits or "STAT" not in font:
        return None
    table = font["STAT"].table
    tags = [axis.AxisTag for axis in table.DesignAxisRecord.Axis]
    for value in table.AxisValueArray.AxisValue if table.AxisValueArray else []:
        if value.Format not in (1, 2, 3) or tags[value.AxisIndex] != "opsz":
            continue
        size = value.NominalValue if value.Format == 2 else value.Value
        if size == limits["opsz"] and not value.Flags & 2:
            return english(font, value.ValueNameID)
    return None


def main(argv):
    if len(argv) < 3 or any("=" not in value for value in argv[2:]):
        sys.exit(__doc__.split("\n\n")[1].strip())
    source, output = argv[0], argv[1]

    font = TTFont(source, recalcTimestamp=False)
    if "fvar" not in font:
        sys.exit(f"{source} is not a variable font")
    axes = {axis.axisTag: axis for axis in font["fvar"].axes}

    # Every axis is fixed: the ones that are named at their value, the others at their default
    limits = {tag: axis.defaultValue for tag, axis in axes.items()}
    for value in argv[2:]:
        tag, _, number = value.partition("=")
        if tag not in axes:
            sys.exit(f"{source} has no axis {tag}. It has: {', '.join(axes)}")
        try:
            limits[tag] = float(number)
        except ValueError:
            sys.exit(f"{value}: the value of an axis is a number, such as wght=600")
        if not axes[tag].minValue <= limits[tag] <= axes[tag].maxValue:
            sys.exit(
                f"{value}: the axis {tag} of {source} is "
                f"{axes[tag].minValue:g} to {axes[tag].maxValue:g}"
            )

    cut = cut_of(font, limits)
    font = instancer.instantiateVariableFont(font, limits, updateFontNames=True)

    family = english(font, 16) or english(font, 1)
    style = english(font, 17) or english(font, 2)

    # The instancer names an optical size in the style, `18pt SemiBold`. A download by weight
    # has it in the family, so that the styles of a cut are the styles of any family
    if cut and (style == cut or style.startswith(f"{cut} ")):
        family = f"{family} {cut}"
        style = style[len(cut) :].strip() or "Regular"
        italic = style == "Italic" or style.endswith(" Italic")
        weight = style[: -len("Italic")].strip() if italic else style
        if weight in ("", "Regular", "Bold"):
            rename(font, 1, family)
            rename(font, 2, style)
        else:
            rename(font, 1, f"{family} {weight}")
            rename(font, 2, "Italic" if italic else "Regular")
        rename(font, 16, family)
        rename(font, 17, style)
        rename(font, 4, f"{family} {style}")

    # The PostScript name and the unique name of a file by weight, in place of the names the
    # instancer builds from the prefix that a variable font keeps for its instances
    postscript = f"{family}-{style}".replace(" ", "")
    vendor = font["OS/2"].achVendID.strip()
    rename(font, 6, postscript)
    rename(font, 3, f"{font['head'].fontRevision:.3f};{vendor};{postscript}")

    font.save(output)
    print(f"{output}: {english(font, 4)}, {postscript}, weight {font['OS/2'].usWeightClass}")


if __name__ == "__main__":
    main(sys.argv[1:])
