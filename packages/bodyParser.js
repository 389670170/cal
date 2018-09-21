/**
 * 不包含 busboy 相应代码，不支持 content-type 为 multipart/form-data 类型的解析
 * Created by Tenny. on 2018/4/4 17:50.
 */
const qs = require('querystring');
const zlib = require('zlib');
const getBody = require('raw-body');

/**
 * RegExp to match the first non-space in a string.
 * Allowed whitespace is defined in RFC 7159:
 *  ws = *(
 *    %x20 / ; Space
 *    %x09 / ; Horizontal tab
 *    %x0A / ; Line feed or New line
 *    %x0D ) ; Carriage return
 * eslint-disable-line no-control-regex
 */
const FIRST_CHAR_REGEXP = /^[\x20\x09\x0a\x0d]*(.)/;

/**
 * Get the first non-whitespace character in a string.
 * @param {string} str
 * @return {function}
 * @private
 */
function firstchar (str) {
  return FIRST_CHAR_REGEXP.exec(str)[1]
}

/**
 * 普通的解析(text, raw)
 * @param buf
 * @returns {*}
 */
function parse(buf) {
  return buf;
}

/**
 * 解析数据为 JSON 格式
 * @param body
 * @returns {*}
 */
function jsonParse(body) {
  // special-case empty json body, as it's a common client-side mistake
  // TODO: maybe make this configurable or part of "strict" option
  if (body.length === 0) {
    return {}
  }
  let first = firstchar(body);
  if (first !== '{' && first !== '[') {
    throw new Error(`the first char is ${first}, JSON first char must be { or [`);
  }
  return JSON.parse(body);
}

/**
 * 使用 querystring 解析数据
 * @param body
 * @returns {{}}
 */
function formParse(body) {
  return body.length ? qs.parse(body) : {};
}

/**
 * 读取 request 中的内容 Stream
 * @param req Nodejs request
 */
function contentStream(req) {
  let encoding = (req.headers['content-encoding'] || 'identity').toLowerCase();
  let length = req.headers['content-length'];
  let stream;
  switch (encoding) {
    case 'deflate':
      stream = zlib.createInflate();
      req.pipe(stream);
      break;
    case 'gzip':
      stream = zlib.createGunzip();
      req.pipe(stream);
      break;
    case 'identity':
      stream = req;
      stream.length = length;
      break;
    default:
      throw new Error(`unsupported content encoding ${encoding}`);
  }
  return stream
}

/**
 * 读取输入了中的数据
 * @param req     Nodejs request
 * @param parse   数据解析函数
 * @param options 对应的解析模式的配置
 */
async function read(req, parse, options) {
  let stream = contentStream(req);
  let length = stream.length;
  stream.length = undefined;
  options.length = length;
  let text = await getBody(stream, options);
  return parse(text);
}

/**
 * 继承类型
 * @param original Array        原始类型集合
 * @param extend   Array|String 现在的类型
 */
function extendType(original, extend) {
  if (extend) {
    if (!Array.isArray(extend)) {
      extend = [extend];
    }
    extend.forEach(function (extend) {
      original.push(extend);
    });
  }
}

module.exports = function(opts) {
  let defaultOpts = {
    text: {
      limit: '1mb',
      encoding: true
    },
    json: {
      limit: '1mb',
      encoding: true
    },
    form: {
      limit: '56kb',
      encoding: true
    },
    raw: {
      limit: '100kb',
      encoding: true
    },
    xml: {
      limit: '1mb',
      encoding: true
    },
	extendTypes: {}
  };

  let aopts = Object.assign(defaultOpts, opts);

  // default json types
  let jsonTypes = [
    'application/json',
    'application/json-patch+json',
    'application/vnd.api+json',
    'application/csp-report'
  ];
  // default form types
  let formTypes = [
    'application/x-www-form-urlencoded'
  ];
  // default text types
  let textTypes = [
    'text/plain',
    'text/html'
  ];
  // 默认的 raw types
  let rawTypes = ['application/octet-stream'];
  // FormData types
  let multTypes = ['multipart/form-data'];
  // xml types
  let xmlTypes = ['text/xml'];

  extendType(jsonTypes, aopts.extendTypes.json);
  extendType(formTypes, aopts.extendTypes.form);
  extendType(textTypes, aopts.extendTypes.text);
  extendType(rawTypes, aopts.extendTypes.raw);
  extendType(xmlTypes, aopts.extendTypes.xml);

  return async (ctx, next) => {
    /**
     * 跳过解析的情况：
     *  1. 已经解析过
     *  2. 设置了禁止解析
     *  3. 请求方式为 GET
     */
    if(ctx.request.body !== undefined ||
      ctx.disableBodyParser ||
      ctx.method.toLowerCase() === 'get')
      return await next();
    try {
      ctx.request.body = await parseBody(ctx);
      await next();
    } catch (err) {
      throw err;
    }
  };

  async function parseBody(ctx) {
    if (ctx.is(jsonTypes)) {
      return await read(ctx.req, jsonParse, aopts.json);
    } else if (ctx.is(formTypes)) {
      return await read(ctx.req, formParse, aopts.form);
    } else if (ctx.is(textTypes)) {
      return await read(ctx.req, parse, aopts.text);
    } else if(ctx.is(rawTypes))  {
      return await read(ctx.req, parse, aopts.raw);
    } else if(ctx.is(xmlTypes)) {
      return await read(ctx.req, parse, aopts.xml);
    }
    return undefined;
  }
};
