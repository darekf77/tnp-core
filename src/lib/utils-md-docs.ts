import { json5, path } from './core-imports';
import { Helpers } from './helpers';
import { UtilsFilesFoldersSync } from './utils-files-folders';

export namespace UtilsMdDocs {
  //#region get render imports
  export interface RenderImport {
    packageName?: string;
    isLocal: boolean;
    relativePath: string;
    context: any;
    rawRenderTagString: string;
  }

  export function getRenderImports(mdContent: string): RenderImport[] {
    //#region @backendFunc
    const result: RenderImport[] = [];

    /**
     * Supports:
     *
     * <!-- @render './my-file' -->
     * <!-- @render "./my-file" { title: 'hello' } -->
     *
     * // @render './my-file'
     * // @render "./my-file" { title: 'hello' }
     */
    const renderRegex =
      /(<!--\s*@render\s+(['"])(.*?)\2(?:\s+(\{[\s\S]*?\}))?\s*-->|\/\/\s*@render\s+(['"])(.*?)\5(?:\s+(\{.*?\}))?\s*$)/gm;

    let match: RegExpExecArray | null;

    while ((match = renderRegex.exec(mdContent))) {
      const rawRenderTagString = match[0];

      // HTML comment variant uses groups 2-4,
      // // variant uses groups 5-7.
      const importPath = (match[3] ?? match[6]).trim();
      const contextRaw = (match[4] ?? match[7])?.trim();

      const isLocal =
        importPath.startsWith('./') ||
        importPath.startsWith('../') ||
        importPath.startsWith('/');

      let packageName: string | undefined;
      let relativePath = importPath;

      if (!isLocal) {
        const parts = importPath.split('/');

        if (importPath.startsWith('@')) {
          packageName = parts.slice(0, 2).join('/');
          relativePath = parts.slice(2).join('/');
        } else {
          packageName = parts[0];
          relativePath = parts.slice(1).join('/');
        }
      }

      let context: any = undefined;

      if (contextRaw) {
        try {
          context = json5.parse(contextRaw);
        } catch (error) {
          throw new Error(
            `Invalid @render context for "${importPath}": ${contextRaw}`,
            { cause: error },
          );
        }
      }

      result.push({
        packageName,
        isLocal,
        relativePath,
        context,
        rawRenderTagString,
      });
    }

    return result;
    //#endregion
  }
  //#endregion

  //#region get assets
  /**
   * extract assets pathes from .md file
   */
  export const getAssets = (mdfileContent: string): string[] => {
    //#region @backendFunc
    // Regular expressions for detecting assets
    const markdownImgRegex = /!\[.*?\]\((.*?)\)/g; // Markdown image syntax ![alt](src)
    const htmlImgRegex = /<img.*?src=["'](.*?)["']/g; // HTML image syntax <img src="path">

    const assets: string[] = [];

    let match: RegExpExecArray | null;

    // Extract Markdown image links
    while ((match = markdownImgRegex.exec(mdfileContent)) !== null) {
      assets.push(match[1]); // Get the image path
    }

    // Extract HTML image links
    while ((match = htmlImgRegex.exec(mdfileContent)) !== null) {
      assets.push(match[1]); // Get the image path
    }

    return assets.map(r => r.replace(new RegExp(/^\.\//), ''));
    //#endregion
  };
  //#endregion

  //#region get asset from file
  export const getAssetsFromFile = (absPathToFile: string): string[] => {
    //#region @backendFunc
    if (!Helpers.exists(absPathToFile)) {
      return [];
    }
    if (path.extname(absPathToFile).toLowerCase() !== '.md') {
      return [];
    }
    return getAssets(UtilsFilesFoldersSync.readFile(absPathToFile));
    //#endregion
  };
  //#endregion

  //#region get links to other md files
  /**
   * Extract links to other Markdown files from a given Markdown content.
   * @param mdfileContent
   */
  export const getLinksToOtherMdFiles = (mdfileContent: string): string[] => {
    //#region @backendFunc
    // Regex pattern to match Markdown and HTML links to .md files
    const mdLinkPattern = /\[.*?\]\(([^)]+\.md)\)/g; // Matches [text](link.md)
    // const htmlLinkPattern = /<a\s+href=["']([^"']+\.md)["'].*?>/g; // Matches <a href="link.md">

    const links = new Set<string>(); // Use a Set to avoid duplicate links

    // Find all Markdown-style links
    let match;
    while ((match = mdLinkPattern.exec(mdfileContent)) !== null) {
      links.add(match[1]);
    }

    // Find all HTML-style links
    // while ((match = htmlLinkPattern.exec(mdfileContent)) !== null) {
    //   links.add(match[1]);
    // }

    return Array.from(links); // Convert Set to Array and return
    //#endregion
  };
  //#endregion
}
