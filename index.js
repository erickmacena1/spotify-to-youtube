const puppeteer = require('puppeteer');
const readlineSync = require('readline-sync');

const LIST_MAX_LENGHT = 50; // The maximum size of youtube music lists is 50!

spotifyToYoutube();

async function spotifyToYoutube() {

    const embedUrl = getEmbedUrl()

    if (embedUrl === -1) {
        readlineSync.question("Link invalido, terminando o programa (ENTER) ...");
        return;
    }

    console.log("\n*** Playlist identificada, extraindo nomes das musicas ***\n")

    const browser = await puppeteer.launch({ headless: true });

    const musicsObjList = await getMusicsNamesObj(embedUrl, browser);

    console.log(`\n*** Foram extraidas ${musicsObjList.length} nomes de musicas ***\n`);
    console.log(`\nProcurando músicas no youtube...\n`);

    const idList = await getVideoIdList(musicsObjList, browser)

    console.log(`\n *** Foram contrados ${idList.length} videos no youtube ***`)
    console.log("\nGerando sua playlist...\n")

    if (idList.length <= LIST_MAX_LENGHT) {
        let finalUrl = await createYoutubeList(idList, browser);

        console.log(`\n*** PLAYLIST GERADA COM SUCESSO ***\n---- ${finalUrl} ----`)
    }
    else {
        let n = Math.ceil(idList.length / LIST_MAX_LENGHT);
        let playlists = '';

        for (let i = 0; i < n; i++) {
            console.log(`Gerando playlists ${i + 1} de ${n} ***`);

            let currSlice = idList.slice(i * LIST_MAX_LENGHT, (i + 1) * LIST_MAX_LENGHT)
            let currUrl = await createYoutubeList(currSlice, browser)

            playlists += currUrl + '\n'
        }
        console.log(`\n*** PLAYLISTS GERADAS COM SUCESSO ***
------------ 
${playlists} 
------------`)
    }

    await browser.close();
}

function getEmbedUrl() {

    let sptyUrl = readlineSync.question('Cole o link da playlist do spotify aqui: ');

    if (sptyUrl == '') return -1;

    sptyUrl = sptyUrl.split("/");

    let embedUrl = "https://open.spotify.com/embed/playlist/" + sptyUrl[sptyUrl.length - 1];

    return embedUrl;
}

async function getMusicsNamesObj(embedUrl, browser) {

    let page = await browser.newPage();

    await page.goto(embedUrl);

    const musicsObjList = await page.evaluate(() => {
        const musicsElem = Array.from(document.querySelectorAll(".ah.dr.b3"))

        let musicsObjList = musicsElem.map(div => {
            let childs = div.querySelectorAll("div");

            return {
                name: childs[0].innerText,
                authors: childs[1].innerText
            }
        })

        return musicsObjList;
    })

    return musicsObjList;
}

async function getVideoIdList(musicList = [], browser) {

    const page = (await browser.pages())[1];
    const ytSearchUrl = 'https://www.youtube.com/results?search_query=';
    const idList = [];

    for (let i in musicList) {
        console.log(`\n*** Buscando Musica ${parseInt(i) + 1} ***\n`)
        let musicObj = musicList[i];
        let searchStr = musicObj.authors + " " + musicObj.name;

        await page.goto(ytSearchUrl + encodeURI(searchStr));
        await page.evaluate(() => {
            document.querySelector("#video-title > yt-formatted-string").click();
        })
        await sleep(100);

        idList.push(extractVideoId(await page.url()))
    }

    return idList
}

function extractVideoId(url) {
    return url.split("?v=")[1].split("%")[0]
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createYoutubeList(idList, browser) {

    let listUrl = "http://www.youtube.com/watch_videos?video_ids=" + idList.join(",");

    const page = (await browser.pages())[1];
    await page.goto(listUrl);
    await page.on("load");

    listUrl = await page.url();

    return listUrl;
}
