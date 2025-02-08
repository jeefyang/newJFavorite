import fs from "fs";
import { ConfigType } from "./type";
import { FavoriteServe } from "./serve";

var args = process.argv;

if (args.length < 3) {
  console.log("参数不足,请修改后再重启!!!");
} else {
  let file = args[2];
  if (!fs.existsSync(file)) {
    console.log("没有找到配置文件,创建新的配置文件");
    fs.copyFileSync("./favoriteConfig.example.jsonc", file, fs.constants.COPYFILE_EXCL);
  }

  let str = fs.readFileSync(file, { encoding: "utf-8" });
  let obj: ConfigType = eval("(" + str + ")");
  console.log(obj);
  new FavoriteServe(obj);
}
