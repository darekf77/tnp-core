import { ContentType, mimeTypes } from "./core-models";
import axios, { AxiosResponse } from 'axios';
import { path } from "./core-imports";
import { Helpers } from "./index";
//#region @backend
import { Blob } from 'buffer';
//#endregion

const BLOB_SUPPORTED_IN_SQLJS = false;

export namespace Utils {

  //#region db binary format type
  export enum DbBinaryFormatEnum {
    Blob = 'Blob',
    File = 'File',
    string = 'string',
    //#region @backend
    Buffer = 'Buffer',
    //#endregion
  }

  export type DbBinaryFormatForBrowser = Blob | File | string;
  //#region @backend
  export type DbBinaryFormatForBackend = Buffer;
  //#endregion

  /**
   * Binary format that can be stored in database
   *
   * for nodejs => Buffer
   * for sql.js => string (shoulb be blob - but not supported)
   *
   */
  export type DbBinaryFormat = DbBinaryFormatForBrowser
    //#region @backend
    | DbBinaryFormatForBackend;
  //#endregion
  //#endregion
  export namespace binary {

    //#region binay utils / array buffer to blob
    //#region @browser
    /**
     * This is for BROWSER ONLY
     *
     * @param buffer
     * @param contentType
     * @returns
     */
    export async function arrayBufferToBlob(buffer: ArrayBuffer, contentType: ContentType): Promise<Blob> {
      // @ts-ignore
      return new Blob([buffer], { type: contentType });
    }
    //#endregion
    //#endregion

    //#region binay utils / blob to array buffer
    /**
     * This is for BROWSER ONLY
     * @param blob
     * @returns
     */
    export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('loadend', () => {
          resolve(reader.result as any);
        });
        reader.addEventListener('error', reject); // @ts-ignore
        reader.readAsArrayBuffer(blob);
      });
    }
    //#endregion

    //#region binay utils / blob to base64 string
    /**
     * it is revers to base64toBlob
     * @param blob
     * @returns
     */
    export function blobToBase64(blob: Blob): Promise<string> {
      return new Promise<any>((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // @ts-ignore
        reader.readAsDataURL(blob);
      });
    }
    //#endregion

    //#region binay utils / base64 string to blob
    /**
     * it is revers to blobToBase64()
     * @param base64Data
     * @returns
     */
    export async function base64toBlob(base64Data: string, contentTypeOverride?: ContentType): Promise<Blob> {
      let content_type: ContentType = void 0 as any;
      let file_base64: string = void 0 as any;
      if (!contentTypeOverride) {
        const m = /^data:(.+?);base64,(.+)$/.exec(base64Data);
        if (!m) {
          throw new Error(`[firedev-framework][base64toBlob] Not a base64 blob [${base64Data}]`)
        }
        // tslint:disable-next-line:prefer-const
        var [__, contenttype, filebase64] = m;
        content_type = contenttype as any;
        file_base64 = filebase64;
      }
      content_type = (contentTypeOverride ? contentTypeOverride : content_type || '') as any;
      base64Data = contentTypeOverride ? base64Data : file_base64;
      const sliceSize = 1024;
      const byteCharacters = atob(base64Data);
      const bytesLength = byteCharacters.length;
      const slicesCount = Math.ceil(bytesLength / sliceSize);
      const byteArrays = new Array(slicesCount);

      for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        const begin = sliceIndex * sliceSize;
        const end = Math.min(begin + sliceSize, bytesLength);

        const bytes = new Array(end - begin);
        // tslint:disable-next-line:one-variable-per-declaration
        for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
          bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
      }
      return new Blob(byteArrays, { type: content_type });
    }
    //#endregion

    //#region binay utils / base64 string to db binary format

    export async function base64toDbBinaryFormat(text: string): Promise<DbBinaryFormat> {
      let result: DbBinaryFormat;
      //#region @browser
      result = await (async () => {
        if (BLOB_SUPPORTED_IN_SQLJS) {
          const blob = await base64toBlob(text);
          return blob;
        }
        return text as any;
      })();
      //#endregion
      //#region @backend
      result = await (async () => {
        const buffer = await base64toBuffer(text);
        return buffer;
      })();
      //#endregion
      return result;
    }
    //#endregion

    //#region binay utils / db binary format to base64 string
    export async function dbBinaryFormatToBase64(binaryFormat: DbBinaryFormat): Promise<string> {
      let result: string;
      //#region @browser
      result = await (async () => {
        if (BLOB_SUPPORTED_IN_SQLJS) {
          const text = await blobToBase64(binaryFormat as any);
          return text;
        }
        return binaryFormat as any;
      })();
      //#endregion

      //#region @backend
      result = await (async () => {
        const text = await bufferToBase64(binaryFormat as any);
        return text;
      })();
      //#endregion
      return result;
    }
    //#endregion







    //#region binay utils / base64 string to db binary format

    export async function textToDbBinaryFormat(text: string): Promise<DbBinaryFormat> {
      let result: DbBinaryFormat;
      //#region @browser
      result = await (async () => {
        if (BLOB_SUPPORTED_IN_SQLJS) {
          const blob = await textToBlob(text);
          return blob;
        }
        return text as any;
      })();
      //#endregion
      //#region @backend
      result = await (async () => {
        const buffer = await textToBuffer(text);
        return buffer;
      })();
      //#endregion
      return result;
    }
    //#endregion

    //#region binay utils / db binary format to base64 string
    export async function dbBinaryFormatToText(binaryFormat: DbBinaryFormat): Promise<string> {
      let result: string;
      //#region @browser
      result = await (async () => {
        if (BLOB_SUPPORTED_IN_SQLJS) {
          const text = await blobToText(binaryFormat as any);
          return text;
        }
        return binaryFormat as any;
      })();
      //#endregion

      //#region @backend
      result = await (async () => {
        const text = await bufferToText(binaryFormat as any);
        return text;
      })();
      //#endregion
      return result;
    }
    //#endregion





    //#region binay utils / base64 string to nodejs buffer
    //#region @backend
    export async function base64toBuffer(base64Data: string, contentTypeOverride?: ContentType): Promise<Buffer> {
      const blob = await base64toBlob(base64Data, contentTypeOverride);
      const buffer = await blobToBuffer(blob);
      return buffer;
    }
    //#endregion
    //#endregion

    //#region binay utils / nodejs buffer to base64 string
    //#region @backend
    export async function bufferToBase64(bufferData: Buffer): Promise<string> {
      const blob = await bufferToBlob(bufferData);
      const text = await blobToBase64(blob);
      return text;
    }
    //#endregion
    //#endregion

    //#region binay utils / file to blob
    export async function fileToBlob(file: File) {
      return new Blob([new Uint8Array(await file.arrayBuffer())], { type: file.type })
    };
    //#endregion

    //#region binay utils / blob to file
    export async function blobToFile(blob: Blob, nameForFile: string = 'my-file-name'): Promise<File> {
      if (!nameForFile) {
        nameForFile = 'nonamefile' + (new Date()).getTime();
      };
      // @ts-ignore
      return new File([blob], nameForFile);
    }
    //#endregion

    //#region binay utils / nodejs blob to nodejs buffer
    //#region @backend
    export async function blobToBuffer(blob: Blob): Promise<Buffer> {
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer;
    }
    //#endregion
    //#endregion

    //#region binay utils / nodejs buffer to nodejs blob
    //#region @backend
    export async function bufferToBlob(buffer: Buffer): Promise<Blob> {
      const blob = new Blob([buffer]); // JavaScript Blob
      return blob;
    }
    //#endregion
    //#endregion

    //#region binay utils / text to nodejs buffer
    //#region @backend
    export async function textToBuffer(text: string, type: ContentType = 'text/plain'): Promise<Buffer> {
      const blob = await textToBlob(text, type);
      const buffer = await blobToBuffer(blob);
      return buffer;
    }
    //#endregion
    //#endregion

    //#region binay utils / nodejs buffer to text
    //#region @backend
    export async function bufferToText(buffer: Buffer): Promise<string> {
      const blob = await bufferToBlob(buffer);
      const text = await blobToText(blob);
      return text;
    }
    //#endregion
    //#endregion

    //#region binay utils / text to blob
    export async function textToBlob(text: string, type: ContentType = 'text/plain'): Promise<Blob> {
      const blob = new Blob([text], { type });
      return blob;
    }
    //#endregion

    //#region binay utils / blob to text
    export async function blobToText(blob: Blob): Promise<string> {
      return await blob.text()
    }
    //#endregion

    //#region binay utils / text to file
    export async function textToFile(text: string, fileRelativePathOrName: string): Promise<File> {
      // console.log({ path })
      const ext = path.extname(fileRelativePathOrName);

      const type = mimeTypes[ext];
      const blob = new Blob([text], { type });
      const file = await blobToFile(blob, fileRelativePathOrName);
      // console.log({
      //   ext,
      //   blob, file
      // });
      // debugger
      return file;
    }
    //#endregion

    //#region binay utils / file to text
    export async function fileToText(file: File): Promise<string> {
      return await file.text();
    }
    //#endregion

    //#region binay utils / json to blob
    export async function jsonToBlob(jsonObj: object): Promise<Blob> {
      const blob = new Blob([JSON.stringify(jsonObj, null, 2)], { type: 'application/json' });
      return blob;
    }
    //#endregion

    //#region binay utils / blob to json
    /**
     * TODO NOT TESTED
     */
    export async function blobToJson(blob: Blob): Promise<string> {
      return JSON.parse(await blob.text())
    }
    //#endregion



    //#region binay utils / get blob from url
    export async function getBlobFrom(url: string): Promise<Blob> {
      const response: AxiosResponse<Blob> = await axios({
        url,
        method: 'get',
        responseType: 'blob'
      });
      return response.data;
    }
    //#endregion

  }

  export namespace css {
    //#region css utils / numeric value of pixels
    /**
     *
     * @param pixelsCss pixels ex. 100px
     * @returns
     */
    export function numValue(pixelsCss: string | number): number {
      // tslint:disable-next-line:radix
      return parseInt(pixelsCss?.toString()?.replace('px', '')
        // .replace('pt', '') TOOD handle other types
        // .replace('1rem', '') // to
      );
    }
    //#endregion
  }


}
