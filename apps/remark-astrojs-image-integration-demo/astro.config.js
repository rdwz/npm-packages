import { defineConfig } from "astro/config";
import image from "@astrojs/image";
import remarkAstrojsImage from "@altano/remark-astrojs-image";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  site: "https://test.example.org",
  integrations: [
    image(),
    preact(),
    mdx({
      remarkPlugins: {
        extends: [remarkAstrojsImage], // extends: [
        //   [
        //     remarkAstrojsImageUseComponent,
        //     {
        //       convertMarkdownImages: true,
        //       convertJsxImages: true,
        //       convertJsxPictures: true,
        //     },
        //   ],
        //   [
        //     remarkAstrojsImageAutoImport,
        //     {
        //       ignoreFileNotFound: false,
        //       ignoreNonFileUrl: true,
        //     },
        //   ],
        // ],
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      // Choose from Shiki's built-in themes (or add your own)
      // https://github.com/shikijs/shiki/blob/main/docs/themes.md
      theme: "dracula",
      // theme: shiki.loadTheme("xtree-gold"),
      // Add custom languages
      // Note: Shiki has countless langs built-in, including .astro!
      // https://github.com/shikijs/shiki/blob/main/docs/languages.md
      langs: [],
      // Enable word wrap to prevent horizontal scrolling
      wrap: true,
    },
  },
});