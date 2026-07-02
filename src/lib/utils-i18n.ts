export namespace UtilsI18n {
  export const defaultLangLocale: UtilsI18n.CommonLocaleCode = 'en-US';

  export enum CommonLocaleCodeEnum {
    PL_PL = 'pl-PL',
    EN_US = 'en-US',
    EN_GB = 'en-GB',
    DE_DE = 'de-DE',
    FR_FR = 'fr-FR',
    ES_ES = 'es-ES',
    ZH_CN = 'zh-CN',
  }

  const LangOptionMap = {
    [CommonLocaleCodeEnum.PL_PL]: 'Polski',
    [CommonLocaleCodeEnum.EN_US]: 'English (US)',
    [CommonLocaleCodeEnum.EN_GB]: 'English (UK)',
    [CommonLocaleCodeEnum.DE_DE]: 'German',
    [CommonLocaleCodeEnum.FR_FR]: 'French',
    [CommonLocaleCodeEnum.ES_ES]: 'Spain',
    [CommonLocaleCodeEnum.ZH_CN]: 'Chinese',
  };

  export const commonLocales = Object.values(
    CommonLocaleCodeEnum,
  ) as CommonLocaleCode[];

  export type CommonLocaleCode = `${CommonLocaleCodeEnum}`;

  export interface LangOption {
    code: UtilsI18n.CommonLocaleCode;
    label: string;
  }

  export const LangOptionArr = Object.keys(LangOptionMap).map(code => ({
    code,
    label: LangOptionMap[code],
  })) as LangOption[];

  export function detectLocale(): CommonLocaleCode {
    const candidates = navigator.languages.length
      ? navigator.languages
      : [navigator.language];

    for (const candidate of candidates) {
      // Exact match
      if (commonLocales.includes(candidate as CommonLocaleCode)) {
        return candidate as CommonLocaleCode;
      }

      // Match by language only
      const language = candidate.split('-')[0];
      const fallback = commonLocales.find(
        locale => locale.split('-')[0] === language,
      );

      if (fallback) {
        return fallback;
      }
    }

    return defaultLangLocale;
  }

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
