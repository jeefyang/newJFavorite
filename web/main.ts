import "./global";
import "./newStyle.css";

class Tools {
    _id: number = 1;
    get id() {
        return ++this._id;
    }

    constructor() { }
    /** 解析html */
    decodeHtml(html: string, type: "html" | "json") {
        let a = decodeURIComponent(html);
        if (type == "html") {
            let parser = new DOMParser();
            let xmlDoc = parser.parseFromString(a, "text/html");
            let tdList = xmlDoc.getElementsByTagName("dt");
            console.log(tdList);
            let td: HTMLElement;
            // @ts-ignore
            let tagName = tdList?.[0]?.children?.[0]?.innerHTML
            td = tdList?.[0];
            if (!td) {
                return;
            }
            const data: folderType = {
                name: tagName,
                type: "folder",
                children: [],
                id: this.id
            };
            this.loopSetData(td, data);
            return data;
        } else if (type == "json") {
            // console.log(a)
            const data: folderType = JSON.parse(a);
            return data;
        }
    }

    /** 循环设置数据 */
    loopSetData(td: HTMLElement, data: folderType) {
        let dl = td?.children?.[1];
        if (dl?.tagName != "DL" || dl.children.length == 0) {
            return;
        }

        for (let i = 0; i < dl.children.length; i++) {
            // @ts-ignore
            let child: HTMLElement = dl.children[i];
            if (child.tagName != "DT") {
                continue;
            }
            let childChild = child?.children?.[0];
            if (!childChild) {
                continue;
            }
            let childData: folderType = {
                name: childChild.innerHTML,
                type: "folder",
                children: [],
                id: this.id
            };
            let href = childChild.getAttribute("href");
            let icon = childChild.getAttribute("icon");
            if (href) {
                childData.type = "url";
                childData.icon = icon;
                childData.url = href;
            }
            data.children.push(childData);
            this.loopSetData(child, childData);
        }
    }

    /** 搜索 */
    searchKey(key: string, data: folderType) {
        const searchList: folderType[] = [];
        if (!key) {
            return searchList;
        }
        let reg = new RegExp(key, "i");
        let loopFunc = (curData: folderType) => {
            if (curData.type == "url" && (curData.name.search(reg) != -1 || curData.url.search(key) != -1)) {
                searchList.push(curData);
                return;
            } else if (curData.type == "folder" && curData.children) {
                curData.children.forEach((child) => {
                    loopFunc(child);
                });
            }
        };
        loopFunc(data);
        return searchList;
    }

    /** 快速上传 */
    async quickUploadFile() {
        let uploadUrl = "/upload";
        const urlData = new URL(location.href);
        const folder = urlData.searchParams.get("folder") || "";
        uploadUrl += `?folder=${folder}`;
        let filename = urlData.searchParams.get("file");
        if (filename) {
            uploadUrl += `&forcefilename=${filename}`;
        }

        let file = await this.readFile();
        let uploadstatus = await this.uploadFile(file, uploadUrl);
        if (uploadstatus) {
            let c = confirm("上传成功,需要刷新吗?");
            if (c) {
                location.reload();
            }
        } else {
            alert("上传失败!!!");
        }
    }

    /** 读取文件 */
    async readFile() {
        return new Promise<File>((resolve, _reject) => {
            let input = document.createElement("input");
            input.setAttribute("type", "file");
            input.onchange = (e: any) => {
                resolve(e.target.files[0]);
            };
            input.click();
        });
    }

    /** 上传文件 */
    async uploadFile(file: File, url: string) {
        return new Promise<boolean>((res, _rej) => {
            let form = new FormData();
            form.append("file", file);
            form.append("forceFileName", "test.html");
            let xhr = new XMLHttpRequest();
            xhr.open("post", url, true);
            xhr.addEventListener("readystatechange", () => {
                let r = xhr;
                if (r.status != 200) {
                    console.warn("上传失败", r.status, r.statusText, r.response);
                    res(false);
                } else if (r.readyState == 4) {
                    console.log("上传成功");
                    res(true);
                }
            });
            xhr.send(form);
        });
    }

    /** 下载历史文件 */
    async downloadHistory(filename: string) {
        return new Promise<string>(async (res, _rej) => {
            const urlData = new URL(location.href);
            const response = await fetch(`/download?folder=${urlData.searchParams.get("folder") || ""}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ filename })
            });
            // 处理错误响应
            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(`下载失败: ${errorMessage}`);
            }
            // 从响应头获取文件名
            const contentDisposition = response.headers.get("Content-Disposition");
            const suggestedFilename = contentDisposition ? contentDisposition.split("filename=")[1].replace(/"/g, "") : filename;

            // 将响应转换为 Blob（二进制数据）
            const blob = await response.blob();

            // 创建临时链接触发下载
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = suggestedFilename; // 设置下载的文件名
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            res(undefined);
        });
    }

    /** 获取历史列表 */
    async getHistoryList() {
        const urlData = new URL(location.href);
        let data: string[] = await (await fetch(`/getlist?folder=${urlData.searchParams.get("folder") || ""}`)).json();
        return data;
    }
}

const { createApp, ref } = Vue;
createApp({
    setup() {
        const tools = new Tools();
        const data = tools.decodeHtml(favoritesUrl, favoritesType);
        /** 路径列表 */
        const pathList = ref<folderType[]>([data]);
        /** 页面列表 */
        const pageList = ref<folderType[]>(data?.children || []);
        /** 搜索关键字 */
        const searchList = ref<folderType[]>([]);
        /** 搜索关键字 */
        const searchKey = ref("");
        /** 历史列表 */
        const historyList = ref<string[]>(null);
        /** 显示历史 */
        const displayHistory = ref(false);
        const message = ref("Hello vue!");


        /** 显示历史大法 */
        const openHistoryFn = async () => {
            if (!historyList.value) {
                historyList.value = await tools.getHistoryList();
            }
            displayHistory.value = true;
        };

        /** 跳转历史大法 */
        const toHistoryFn = async (item: string) => {
            const urlData = new URL(location.href);
            location.replace(`?folder=${urlData.searchParams.get("folder") || ""}&file=${item}`);
        };

        const downloadHistoryFn = async (item: string) => {
            await tools.downloadHistory(item);
        };

        /** 选中文件夹大法 */
        const selectPathFn = (item: folderType, index: number) => {
            pathList.value = pathList.value.slice(0, index + 1);
            pageList.value = item.children || [];
        };

        /** 跳转文件夹大法 */
        const toPathFn = (item: folderType) => {
            pathList.value.push(item);
            //   pageList.value =[...item.children||[],...item.children||[],...item.children||[]] || [];
            pageList.value = item.children || [];
        };

        /** 跳转路径大法 */
        const toUrlFn = (item: folderType) => {
            window.open(item.url, "_blank");
        };

        /** 搜索大法 */
        const searchFn = (key: string) => {
            searchKey.value = key;
            searchList.value = tools.searchKey(key, pathList.value[pathList.value.length - 1]);
        };

        return {
            openHistoryFn,
            quickUploadFileFn: () => tools.quickUploadFile(),
            selectPathFn,
            toPathFn,
            toUrlFn,
            searchFn,
            toHistoryFn,
            downloadHistoryFn,
            pathList,
            pageList,
            searchKey,
            searchList,
            displayHistory,
            historyList,
            message,
        };
    }
}).mount("#app");
