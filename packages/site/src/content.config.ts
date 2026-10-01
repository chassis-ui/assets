import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { calloutsSchema, docsSchema } from '@chassis-ui/docs/schema'

const docsCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './content/docs' }),
  schema: docsSchema
})

const calloutsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/callouts' }),
  schema: calloutsSchema
})

export const collections = {
  docs: docsCollection,
  callouts: calloutsCollection
}
