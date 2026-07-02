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
    'pl-PL',
    'en-US',
    'en-GB',
    'de-DE',
    'fr-FR',
    'es-ES',
    'zh-CN',
  ] as const;

  export type CommonLocaleCode = (typeof commonLocales)[number];

  export interface LangOption {
    code: UtilsI18n.CommonLocaleCode;
    label: string;
  }

  export const LangOptionArr: LangOption[] = [
    {
      code: 'en-US',
      label: 'English (US)',
    },
    {
      code: 'pl-PL',
      label: 'Polski',
    },
    {
      code: 'de-DE',
      label: 'German',
    },
    {
      code: 'fr-FR',
      label: 'French',
    },
    {
      code: 'es-ES',
      label: 'Spain',
    },
    {
      code: 'zh-CN',
      label: 'China',
    },
  ];

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
