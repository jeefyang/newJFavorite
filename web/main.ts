import './style.css'
declare let favoritesUrl: string

type folderType = {
  type: "folder" | "url"
  icon?: string
  name: string
  url?: string
  children?: folderType[]
}
const app = document.querySelector<HTMLDivElement>('#app')!
class Main {
  data: folderType
  /** 收藏夹文件夹 */
  folderListDiv: HTMLDivElement
  /** 收藏夹链接 */
  urlListDiv: HTMLDivElement
  /** 搜索输入框 */
  searchInput: HTMLInputElement
  /** 搜索结果列表 */
  searchListDiv: HTMLDivElement
  /** 上传按钮 */
  uploadBtn: HTMLButtonElement
  /** 收藏夹历史按钮 */
  listBtn: HTMLButtonElement
  searchList: folderType[]

  bottonList: { name: string, data: folderType }[] = []
  constructor() {
    this.init()
  }

  init() {
    // console.log(htmlStr)
    let parser = new DOMParser()
    let xmlDoc = parser.parseFromString(favoritesUrl, "text/html")
    console.log(xmlDoc)
    let tdList = xmlDoc.getElementsByTagName("dt")
    let td: HTMLElement
    for (let i = 0; i < tdList.length; i++) {
      let temp = tdList[i]
      if (temp?.children?.[0]?.innerHTML == "收藏夹栏") {
        td = temp
        break
      }
    }
    if (!td) {
      return
    }
    this.data = {
      name: "收藏夹栏",
      type: "folder",
      children: []
    }
    console.log(this.data)
    console.log(td)
    this.loopSetData(td, this.data)
    if (this?.data?.children?.length > 0) {
      this.display()
    }
  }
  /** 显示 */
  display() {

    this.searchInput = document.createElement("input")
    this.uploadBtn = document.createElement("button")
    this.listBtn = document.createElement("button")
    this.searchListDiv = document.createElement("div")
    this.folderListDiv = document.createElement("div")
    this.urlListDiv = document.createElement("div")
    this.searchInput.className = 'searchInput'
    this.folderListDiv.className = "folderListDiv"
    this.urlListDiv.className = "urlListDiv"
    this.searchListDiv.className = "searchListDiv"
    this.uploadBtn.innerHTML = "上传"
    this.listBtn.innerHTML = "列表"
    let topDiv = document.createElement("div")
    topDiv.className = "topDiv"
    topDiv.append(this.searchInput, this.uploadBtn, this.listBtn)
    app.append(topDiv, this.searchListDiv, this.folderListDiv, this.urlListDiv)
    this.bottonList = [{ name: "收藏夹栏", data: this.data }]
    this.updateSearchInput()
    this.updateFolderDiv()
    this.updateUrlListDiv(this.data)
    this.uploadBtn.onclick = () => { this.quickUploadFile() }
    this.listBtn.onclick = () => { this.displayListFavor() }
  }

  async displayListFavor() {
    let data: string[] = await ((await fetch("/getlist")).json())
    let backDiv = document.createElement("div")
    backDiv.className = "list_back"
    document.body.append(backDiv)
    let contentDiv = document.createElement("div")

    backDiv.appendChild(contentDiv)
    for (let i = 0; i < data.length; i++) {
      let btn = document.createElement("button")
      btn.innerHTML = data[i]
      btn.onclick = () => {
        location.replace(`?file=${data[i]}`)
      }
      contentDiv.appendChild(btn)
    }
    // console.log(data)
    backDiv.onclick = () => {
      backDiv.remove()
    }
  }

  async readFile() {
    return new Promise<File>((resolve, _reject) => {
      let input = document.createElement("input")
      input.setAttribute("type", "file")
      input.onchange = (e: any) => {
        resolve(e.target.files[0])
      }
      input.click()
    })
  }

  async uploadFile(file: File, url: string) {
    return new Promise<boolean>((res, _rej) => {
      let form = new FormData()
      form.append("file", file)
      form.append("forceFileName", "test.html")
      let xhr = new XMLHttpRequest()
      xhr.open("post", url, true)
      xhr.addEventListener("readystatechange", () => {
        let r = xhr
        if (r.status != 200) {
          console.warn("上传失败", r.status, r.statusText, r.response)
          res(false)
        }
        else if (r.readyState == 4) {
          console.log("上传成功")
          res(true)
        }
      })
      xhr.send(form)
    })
  }

  async quickUploadFile() {
    let uploadUrl = "/upload"
    let filename = (new URL(location.href)).searchParams.get('file')
    if (filename) {
      uploadUrl += `?forcefilename=${filename}`
    }
    let file = await this.readFile()
    let uploadstatus = await this.uploadFile(file, uploadUrl)
    if (uploadstatus) {
      let c = confirm("上传成功,需要刷新吗?")
      if (c) {
        location.reload()
      }
    }
    else {
      alert("上传失败!!!")
    }
  }

  /** 更新列表 */
  updateUrlListDiv(data: folderType) {
    this.urlListDiv.innerHTML = ""
    if (!data?.children?.length) {
      return;
    }
    for (let i = 0; i < data.children.length; i++) {
      let child = data.children[i]
      // 文件夹
      if (child.type == "folder") {
        let btn = document.createElement("button")
        btn.innerHTML = child.name
        let div = document.createElement('div')
        div.className = "childDiv"
        div.append(btn)
        this.urlListDiv.append(div)
        btn.onclick = () => {
          this.bottonList.push({ name: child.name, data: child })
          this.updateFolderDiv()
          this.updateUrlListDiv(child)
        }
      }
      // 路径
      else {
        let image = new Image()
        image.src = child.icon
        let a = document.createElement("a")
        a.innerHTML = child.name
        let div = document.createElement('div')
        div.className = "childDiv"
        div.append(image, a)
        this.urlListDiv.append(div)
        a.setAttribute("href", child.url)
        a.setAttribute("target", "_blank")
      }
    }
  }

  updateSearchInput() {
    this.searchInput.addEventListener("input", (_e) => {
      let str = this.searchInput.value
      this.searchList = []
      if (!str) {
        this.updateSearchListDiv()
        return
      }
      let reg = new RegExp(str, "i")
      let loopFunc = (data: folderType) => {
        if (data.type == "url" && (data.name.search(reg) != -1 || data.url.search(str) != -1)) {
          this.searchList.push(data)
          return
        }
        else if (data.type == "folder" && data.children) {
          data.children.forEach(child => {
            loopFunc(child)
          })
        }
      }
      loopFunc(this.data)
      this.updateSearchListDiv()
    })
  }

  updateSearchListDiv() {
    this.searchListDiv.innerHTML = ""
    if (!this.searchList) {
      return;
    }
    this.searchList.forEach(child => {
      let image = new Image()
      image.src = child.icon
      let nameA = document.createElement("a")
      nameA.innerHTML = child.name
      nameA.setAttribute("href", child.url)
      nameA.setAttribute("target", "_blank")
      let urlA = document.createElement("a")
      urlA.innerHTML = child.url
      urlA.setAttribute("href", child.url)
      urlA.setAttribute("target", "_blank")
      let div = document.createElement('div')
      div.className = 'childDiv'
      div.append(image, nameA, document.createElement('br'), urlA)
      this.searchListDiv.append(div)

    })
  }

  /** 更新文件夹 */
  updateFolderDiv() {
    this.folderListDiv.innerHTML = ""
    for (let i = 0; i < this.bottonList.length; i++) {
      let child = this.bottonList[i]
      let btn = document.createElement("button")
      btn.className = "folderChildDiv"
      btn.innerHTML = child.name
      this.folderListDiv.appendChild(btn)
      let a = i
      btn.onclick = () => {
        this.bottonList = this.bottonList.slice(0, a + 1)
        this.updateFolderDiv()
        this.updateUrlListDiv(child.data)
      }
    }
  }



  loopSetData(td: HTMLElement, data: folderType) {
    let dl = td?.children?.[1]
    if (dl?.tagName != "DL" || dl.children.length == 0) {
      return
    }

    for (let i = 0; i < dl.children.length; i++) {
      // @ts-ignore
      let child: HTMLElement = dl.children[i]
      if (child.tagName != "DT") {
        continue
      }
      let childChild = child?.children?.[0];
      if (!childChild) {
        continue
      }
      let childData: folderType = {
        name: childChild.innerHTML,
        type: "folder",
        children: []
      }
      let href = childChild.getAttribute("href")
      let icon = childChild.getAttribute("icon")
      if (href) {
        childData.type = "url"
        childData.icon = icon
        childData.url = href
      }
      data.children.push(childData)
      this.loopSetData(child, childData)
    }
  }
}

new Main()
