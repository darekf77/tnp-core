export namespace UtilsHttp {
  //#region param type
  export type ParamType = 'Path' | 'Query' | 'Cookie' | 'Header' | 'Body';
  //#endregion

  //#region http status codes
  /**
   * @deprecated
   * known http code
   */
  export type Code = 200 | 400 | 401 | 404 | 500;
  //#endregion

  //#region http method
  export type Method =
    | 'get'
    | 'post'
    | 'put'
    | 'delete'
    | 'patch'
    | 'head'
    | 'jsonp';

  export const HttpMethodArr: Method[] = [
    'get',
    'post',
    'put',
    'delete',
    'patch',
    'head',
    'jsonp',
  ];
  //#endregion

  //#region get mimie type
  export function mimeType(type: string) {
    if (type.includes('/')) {
      return type;
    }

    const map: Record<string, string> = {
      json: 'application/json',
      html: 'text/html; charset=utf-8',
      text: 'text/plain; charset=utf-8',
      txt: 'text/plain; charset=utf-8',
      xml: 'application/xml',
      js: 'application/javascript',
      css: 'text/css',
      pdf: 'application/pdf',
    };

    return map[type.toLowerCase()] || type;
  }
  //#endregion

  //#region mime types
  /**
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
   */
  export const mimeTypes = {
    '.aac': 'audio/aac',
    '.abw': 'application/x-abiword',
    '.arc': 'application/x-freearc',
    '.avi': 'video/x-msvideo',
    '.azw': 'application/vnd.amazon.ebook',
    '.bin': 'application/octet-stream',
    '.bmp': 'image/bmp',
    '.bz': 'application/x-bzip',
    '.bz2': 'application/x-bzip2',
    '.csh': 'application/x-csh',
    '.css': 'text/css',
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.eot': 'application/vnd.ms-fontobject',
    '.epub': 'application/epub+zip',
    '.gz': 'application/gzip',
    '.gif': 'image/gif',
    '.htm': 'text/html',
    '.html': 'text/html',
    '.ico': 'image/vnd.microsoft.icon',
    '.ics': 'text/calendar',
    '.jar': 'application/java-archive',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.jsonld': 'application/ld+json',
    '.mid': 'application/midi',
    '.midi': 'application/midi',
    '.mjs': 'text/javascript',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.mpeg': 'video/mpeg',
    '.mpkg': 'application/vnd.apple.installer+xml',
    '.odp': 'application/vnd.oasis.opendocument.presentation',
    '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.oga': 'audio/ogg',
    '.ogg': 'audio/ogg',
    '.ogv': 'video/ogg',
    '.ogx': 'application/ogg',
    '.opus': 'audio/opus',
    '.otf': 'font/otf',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.php': 'application/php',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx':
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.rar': 'application/vnd.rar',
    '.rtf': 'application/rtf',
    '.sh': 'application/x-sh',
    '.svg': 'image/svg+xml',
    '.swf': 'application/x-shockwave-flash',
    '.tar': 'application/x-tar',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.ts': 'video/mp2t',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain',
    '.vsd': 'application/vnd.visio',
    '.wav': 'audio/wav',
    '.weba': 'audio/webm',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.xhtml': 'application/xhtml+xml',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xml': 'application/xml',
    '.xul': 'application/vnd.mozilla.xul+xml',
    '.zip': 'application/zip',
    '.3gp': 'video/3gpp',
    '.3g2': 'video/3gpp2',
    '.7z': 'application/x-7z-compressed',
  } as const;

  export type MimeTypeExt = keyof typeof mimeTypes;
  export const MimeTypesObj = mimeTypes;
  //#endregion

  //#region content type
  export type ContentTypeKeys = keyof typeof mimeTypes;
  export type ContentType =
    | (typeof mimeTypes)[ContentTypeKeys]
    | 'multipart/form-data';
  //#endregion

  //#region media type
  /**
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
   */
  export type MediaType =
    | 'text'
    | 'image'
    | 'audio'
    | 'font'
    | 'video'
    | 'application'
    | 'multipart'
    | 'message'
    | 'model';

  export const MediaTypeAllArr = [
    'text',
    'image',
    'audio',
    'video',
    'font',
    'application',
    'multipart',
    'message',
    'model',
  ] as MediaType[];
  //#endregion

  //#region uploaded backend file
  export interface UploadedBackendFile {
    data:
      | any
      //#region @backend
      | Buffer;
    //#endregion
    encoding: string;
    md5: string;
    tempFilePath: string;
    mimetype: ContentType;
    mv: (path, callback) => any;
    name: string;
    truncated: boolean;
  }
  //#endregion
}
