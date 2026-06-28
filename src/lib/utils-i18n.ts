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
}
