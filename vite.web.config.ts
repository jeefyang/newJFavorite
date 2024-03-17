import { defineConfig } from 'vite'
import * as fs from "fs"


export default defineConfig(({ command, mode }) => {
    if (command === 'serve') {
        console.log("serve!!")
        let data = fs.readFileSync("./favorites.html", "utf-8")
        return {
            define: {
                $getfavoritesUrl_test$: JSON.stringify({ data: data })
            }
            // serve 独有配置
        }
    } else {
        // build 独有配置
        return {

            build: {
                rollupOptions: {
                    input: "./index.html"
                },
                minify: false,
                manifest: true,
            },

        }
    }
})