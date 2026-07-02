export namespace UtilsI18n {
  export const languages = [
    'en',
    'pl',
    'de',
    'fr',
    'es',
    'it',
    'pt',
    'nl',
  ] as const;

  export type LanguageCode = (typeof languages)[number];

  export const commonLocales = [
    'en-US',
    'en-GB',
    'pl-PL',
    'de-DE',
    'fr-FR',
    'pt-BR',
  ] as const;

  export type CommonLocaleCode = (typeof commonLocales)[number];

  export interface GettextExtracted {
    lineNumber: number;
    gettextString: string;
    // params?: Record<string, string> | null;
    context?: string;
    /**
     * translation for specyfic language
     */
    translation?: string;
  }

  export interface GettextFile {
    fileAbsPath: string;
    fileRelativePath?: string;
    /**
     * taon thing - file can be for app or lib
     */
    isAppFile?: boolean;
    tags: UtilsI18n.GettextExtracted[];
  }
}
