
export interface ExecuteOptions {
  /** Extract string from line */
  extractFromLine?: (string | Function)[];
  /**
   * Modify output line by line
   */
  outputLineReplace?: (outputLine: string) => string;
  resolvePromiseMsg?: {
    stdout?: string | string[];
    stderr?: string | string[];
  }
  prefix?: string;
  detach?: boolean;
  /**
   * Try command again after fail after n miliseconds
   */
  tryAgainWhenFailAfter?: number;

  /**
   * Use big buffer for big webpack logs
   */
  biggerBuffer?: boolean;
  exitOnError?: boolean;
  exitOnErrorCallback?: (code: number) => void;
  /**
   * From displaying in console
   */
  hideOutput?: {
    stdout?: boolean;
    stderr?: boolean;
  }
}

export interface RunOptions extends ExecuteOptions {
  showCommand?: boolean;

  /**
   * Show process output
   */
  output?: boolean;

  silence?: boolean;
  stdio?: any;

  // detached?: boolean;
  cwd?: string;


}

export type PROGRESS_DATA_TYPE = 'info' | 'error' | 'warning' | 'event';

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
export const mimeTypes = {
  ".aac": "audio/aac",
  ".abw": "application/x-abiword",
  ".arc": "application/x-freearc",
  ".avi": "video/x-msvideo",
  ".azw": "application/vnd.amazon.ebook",
  ".bin": "application/octet-stream",
  ".bmp": "image/bmp",
  ".bz": "application/x-bzip",
  ".bz2": "application/x-bzip2",
  ".csh": "application/x-csh",
  ".css": "text/css",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".eot": "application/vnd.ms-fontobject",
  ".epub": "application/epub+zip",
  ".gz": "application/gzip",
  ".gif": "image/gif",
  ".htm": "text/html",
  ".html": "text/html",
  ".ico": "image/vnd.microsoft.icon",
  ".ics": "text/calendar",
  ".jar": "application/java-archive",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".jsonld": "application/ld+json",
  ".mid": "application/midi",
  ".midi": "application/midi",
  ".mjs": "text/javascript",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpkg": "application/vnd.apple.installer+xml",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".oga": "audio/ogg",
  ".ogg": "audio/ogg",
  ".ogv": "video/ogg",
  ".ogx": "application/ogg",
  ".opus": "audio/opus",
  ".otf": "font/otf",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".php": "application/php",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".rar": "application/vnd.rar",
  ".rtf": "application/rtf",
  ".sh": "application/x-sh",
  ".svg": "image/svg+xml",
  ".swf": "application/x-shockwave-flash",
  ".tar": "application/x-tar",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".ts": "video/mp2t",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".vsd": "application/vnd.visio",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xhtml": "application/xhtml+xml",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xml": "application/xml",
  ".xul": "application/vnd.mozilla.xul+xml",
  ".zip": "application/zip",
  ".3gp": "video/3gpp",
  ".3g2": "video/3gpp2",
  ".7z": "application/x-7z-compressed"
} as const;

export type ContentTypeKeys = keyof typeof mimeTypes;
export type ContentType = typeof mimeTypes[ContentTypeKeys] | 'multipart/form-data';

/**
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 */
export type MediaType =
  'text' | 'image' | 'audio' | 'font'
  | 'video' | 'application' | 'multipart' | 'message' | 'model';

export const MediaTypeAllArr = [
  'text', 'image', 'audio', 'video', 'font',
  'application', 'multipart', 'message', 'model'
] as MediaType[]

type ContentType_ = ContentType;

export namespace Files {
  export type MimeType = keyof typeof mimeTypes;
  export const MimeTypesObj = mimeTypes;
  export type ContentType = ContentType_;
}
