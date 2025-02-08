import { ConfigType } from "./type";
import fs from "fs";
import http from "http";
import path from "path";
import { parse, URL } from "url";

export class FavoriteServe {
  server: http.Server;
  hostName = "localhost";
  webDir: string = "";
  webIndexName: string = "index.html";
  constructor(public config: ConfigType) {
    this.init();
    if (import.meta.env.MODE == "devlopment") {
      this.webDir = "./.dev_web";
    } else if (import.meta.env.MODE == "production") {
      this.webDir = "./build_web";
    }
  }
  init() {
    let favoriteFilePath: string;
    let maxTimeFile: number;
    if (!fs.existsSync(this.config.favoriteDir)) {
      fs.mkdirSync(this.config.favoriteDir, { recursive: true });
    }
    let list = fs.readdirSync(this.config.favoriteDir);
    list.forEach((name) => {
      let filePath = path.join(this.config.favoriteDir, name);
      let stat = fs.statSync(filePath);
      if (stat.isFile()) {
        let time = stat.mtimeMs;
        if (!maxTimeFile || maxTimeFile < time) {
          favoriteFilePath = filePath;
          maxTimeFile = time;
        }
      }
    });
    this.server = http.createServer((req, res) => {
      // let urlParase = new URL(request.url)
      // let url: string = req.url || ""
      let urlParase = parse(req.url || "");
      console.log(urlParase.path);
      let indexHtml: string;
      if (urlParase.pathname == "/") {
        let curFavriteFilePath = favoriteFilePath;
        if (!curFavriteFilePath) {
          res.write("fuck world"); //将index.html显示在客户端
          res.end();
          return;
        }
        let a = new URL(`http://localhost${req.url}`);
        curFavriteFilePath = path.join(this.config.favoriteDir, a.searchParams.get("file") || "");
        if (!fs.existsSync(curFavriteFilePath) || !fs.statSync(curFavriteFilePath).isFile()) {
          curFavriteFilePath = favoriteFilePath;
        }
        let favoriteData = fs.readFileSync(path.join(curFavriteFilePath), "utf-8");

        let filename = urlParase.pathname;
        filename = this.webIndexName;
        indexHtml = fs.readFileSync(path.join(this.webDir, filename), "utf-8");
        indexHtml = indexHtml.replace("$getfavoritesUrl_serve$.data", `\`${encodeURIComponent(favoriteData)}\``);
        indexHtml = indexHtml.replace("$getfavoritesUrl_serve$.type", `\`${path.extname(curFavriteFilePath).replace(".", "").toLocaleLowerCase()}\``);
        res.write(indexHtml); //将index.html显示在客户端
        res.end();
      }
      // 历史列表
      else if (urlParase.pathname == "/getlist") {
        res.write(JSON.stringify(list));
        res.end();
      }
      // 上传
      else if (urlParase.pathname == "/upload") {
        //   res.writeHead(200,{})
        //新建一个空数组接受流的信息
        let chunks: any[] = [];
        //获取的长度
        let num = 0;
        req.on("data", (chunk) => {
          chunks.push(chunk);
          num += chunk.length;
        });
        req.on("end", () => {
          //最终流的内容本体
          let buffer = Buffer.concat(chunks, num);
          // 新建数组接收出去\r\n的数据下标
          let rems: number[] = [];
          // 根据\r\n分离数据和报头
          for (let i = 0; i < buffer.length; i++) {
            let v = buffer[i];
            let v2 = buffer[i + 1];
            // 10代表\n 13代表\r
            if (v == 13 && v2 == 10) {
              rems.push(i);
            }
          }

          let msg: string = buffer.subarray(rems[0] + 2, rems[1]).toString() || "";
          let fileName = msg.match(/filename=".*"/g)[0].split('"')[1];
          console.log(`上传文件名:${fileName}`);
          let newFileName = "";
          let a = new URL(`http://localhost${req.url}`);
          let buf = buffer.subarray(rems[3] + 2, rems[rems.length - 2]);
          let iscurname = a.searchParams.get("iscurname");
          if (iscurname) {
            newFileName = fileName;
          }
          let forcefilename = a.searchParams.get("forcefilename");
          if (forcefilename) {
            newFileName = forcefilename;
          } else {
            let date = new Date();
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            let day = date.getDate();
            newFileName = `favorites_${year}_${month}_${day}.html`;
          }
          console.log(`上传文件名更改:${newFileName}`);
          let fileUrl = `${this.config.favoriteDir}/${newFileName}`;
          fs.writeFileSync(fileUrl, buf);
          console.log(`${newFileName}:写入成功!!!`);
          res.end("upload success!!!");
        });
      }
      // 下载
      else if (urlParase.pathname == "/download") {
        let body = "";
        // 通过req的data事件监听函数，每当接受到请求体的数据，就累加到post变量中
        req.on("data",  (chunk)=> {
          body += chunk.toString();
        });
        // 在end事件触发后，通过querystring.parse将post解析为真正的POST请求格式，然后向客户端返回。
        req.on("end",  ()=> {
          //data = querystring.parse(data);
          //res.end('POST请求内容：\n' + util.inspect(data));
          const { filename } = JSON.parse(body); // 需要处理可能的解析错误
          console.log(this.config,filename);
          const curFavriteFilePath = path.join(this.config.favoriteDir, filename);
          if (!fs.existsSync(curFavriteFilePath) || !fs.statSync(curFavriteFilePath).isFile()) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            return res.end("Invalid filename");
          }
          fs.access(curFavriteFilePath, fs.constants.F_OK, (err) => {
            if (err) {
              res.writeHead(404, { "Content-Type": "text/plain" });
              return res.end("File not found");
            }

            // 获取文件信息（如大小）
            fs.stat(curFavriteFilePath, (err, stats) => {
              if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                return res.end("Server error");
              }

              // 设置响应头
              res.writeHead(200, {
                "Content-Disposition": `attachment; filename="${path.basename(curFavriteFilePath)}"`,
                "Content-Type": "application/octet-stream",
                "Content-Length": stats.size
              });

              // 使用流传输文件内容
              const fileStream = fs.createReadStream(curFavriteFilePath);
              fileStream.pipe(res);

              fileStream.on("error", (err) => {
                console.error("File stream error:", err);
                res.end();
              });
            });
          });
        });
      }
      // 错误页面
      else {
        let filename = path.join(this.webDir, urlParase.pathname);
        fs.readFile(filename, (err, data) => {
          if (err) {
            res.writeHead(404, {
              "content-type": 'text/html;charset="utf-8"'
            });
            res.write("<h1>404错误</h1><p>你要找的页面不存在</p>");
            res.end();
          } else {
            if (path.extname(filename) == ".js") {
              res.writeHead(200, {
                "content-type": 'application/x-javascript;charset="utf-8"'
              });
            }
            res.write(data); //将index.html显示在客户端
            res.end();
          }
        });
      }
      // let pathName = filename
      // console.log(request.url)
      // response.setHeader('Content-Type', 'text/plain');
      // response.end("hello nodejs");
    });
    this.server.listen(this.config.webListen, () => {
      console.log(`网页运行: http://${this.hostName}:${this.config.webListen}`);
    });
  }
}
