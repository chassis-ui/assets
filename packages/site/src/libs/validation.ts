import { z } from 'zod'

// https://ihateregex.io/expr/semver/
const semverRegex =
  /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/

export const zVersionMajorMinor = z.string().regex(/^\d+\.\d+$/)

export const zVersionSemver = z.string().regex(new RegExp(`^${semverRegex.source}$`))
export const zPrefixedVersionSemver = z.string().regex(new RegExp(`^v${semverRegex.source}$`))

export const zLanguageCode = z.string().regex(/^[a-z]{2}(?:-[a-zA-Z]{2})?$/)
