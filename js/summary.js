import { getData, getWatchList } from './data.js';

export function UpdateLoggedTime() {    
    const from_to = document.getElementById('from-to');
    const interval = intervalFromRadio(from_to.checked ? 'from-to' : 'today');    
    showSummary(interval.from, interval.to);    
}

export function InitSummary() {
    initFromTo();
    document.getElementById('today').addEventListener('change', UpdateLoggedTime);
    document.getElementById('from-to').addEventListener('change', UpdateLoggedTime);
    UpdateLoggedTime();    
}


function createBar(val, x0, y0, tick, yScale, n, w, color) {
    const x = x0 + n * w;
    const h = val * tick / yScale;
    const y = y0 - h;
    return `\n<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${color}" stroke-width="1" fill="${color}"/>`;  
}

function intervalFromRadio(val) {
    switch (val) {
        case 'today': {
            const toDate = Date.now();
            let fromDate = new Date(toDate);
            fromDate.setHours(0, 0, 0, 0);
            return { from: fromDate.getTime(), to: toDate };
        }
        case 'from-to': {
            const fromElem = document.getElementById('from-date');
            const toElem   = document.getElementById('to-date');
            const fromDate = new Date(fromElem.value + 'T00:00');
            const toDate   = new Date(toElem.value + 'T23:59:59.999');
            return { from: fromDate.getTime(), to: toDate.getTime() };
        }

    }
    return undefined;
}

function getAxes(padding, tick, x0, y0, xMax, yMax, yScale) {
    const x2Tick  = x0 + padding / 2;

    let ret = `\n<line x1="${x0}" y1="${y0}" x2="${xMax}" y2="${y0}" stroke="black" stroke-width="2" stroke-linecap="round" />`
            + `\n<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${yMax}" stroke="black" stroke-width="2" stroke-linecap="round" />`;

    let yTick = y0;
    for (let i = 1; i < 11; ++i) {
        yTick -= tick;
        ret += `\n<line x1="${x0}" y1="${yTick}" x2="${x2Tick}" y2="${yTick}" stroke="black" stroke-width="1" stroke-linecap="round" />`;
         if (1 == (i % 2)) {
            ret += `\n<text x="${x2Tick + padding / 2}" y=${yTick} font-size="${padding * 2}" fill="black">${i * yScale}</text>`;
        }        
    }

    ret +=  `\n<text x="${x2Tick}" y=${yMax + padding} font-size="${padding * 2}" fill="black">Hours</text>`;

    return ret;
}

function createLedendEntry(label, color, active, x, y, padding) {    
    return `\<rect x="${x}" y="${y}" width="${padding}" height="${padding}" stroke="${color}" stroke-width="1" fill="${color}" />` +
           `\n<text x="${x + 1.5 * padding}" y=${y + padding} font-size="${padding * 1.4}" fill=${active ? "black" : "gray"}>${label}</text>`;
}

function getChartContent(watchlist, data, padding, tick, x0, y0, xMax, yMax, yScale) {    
    let ret = '';

    let barwidth = (xMax - x0);
    x0 += barwidth * 0.2;
    const lx0 = x0 + barwidth * 0.51;
    barwidth /= 2 * watchlist.length;

    let n = 0;
    for (let watch of watchlist) {
        const d = data.get(watch._id);
        if (d) {
            ret += createBar(d, x0, y0, tick, yScale, n, barwidth, watch.color);
            ret += createLedendEntry(watch.title, watch.color, watch.active, lx0, yMax + 2 * padding * n, padding);
            ++n;
        }
    }
    return ret;
}

function showSummary(fromTime, toTime) {
    const svgElement = document.getElementById('svgElement');

    const padding = Math.min(svgElement.viewBox.baseVal.width, svgElement.viewBox.baseVal.height) * 0.02;
    const tick    = svgElement.viewBox.baseVal.height * 0.09;
    const x0      = svgElement.viewBox.baseVal.x + padding;
    const y0      = svgElement.viewBox.baseVal.y + svgElement.viewBox.baseVal.height - padding;
    const xMax    = svgElement.viewBox.baseVal.x + svgElement.viewBox.baseVal.width - padding;
    const yMax    = svgElement.viewBox.baseVal.y + padding;  
    let watchlist = undefined;  

    getWatchList(false)
    .then((wl) => {        
        watchlist = wl;
        getData(fromTime, toTime)
        .then((data) => {
            if (data && watchlist) {                
                let maxVal = 0;
                for (let k of data.keys()) {
                    const v = data.get(k) / 3600000; 
                    if (maxVal < v) {
                        maxVal = v;
                    }
                    data.set(k, v);
                }    
        
                const yScale  = maxVal < 5 ? 0.5 : 
                                maxVal < 10 ? 1 :
                                maxVal < 50 ? 5 :
                                maxVal < 100 ? 10 :
                                maxVal < 500 ? 50 :
                                maxVal < 1000 ? 100 :
                                maxVal < 5000 ? 500 :
                                maxVal < 10000 ? 1000 : 
                                maxVal < 50000 ? 5000 :
                                maxVal < 100000 ? 10000 :
                                maxVal < 500000 ? 50000 : 100000;
                
                svgElement.innerHTML = getAxes(padding, tick, x0, y0, xMax, yMax, yScale) 
                                    + getChartContent(watchlist, data, padding, tick, x0, y0, xMax, yMax, yScale);

            } else {
                console.log('Data missing: ', data, watchlist);
            }       
        });
    })    
    .catch((error) => {
        console.log(`Error retrieving data to show ${error}`);
    });
}

function initFromTo() {
    const fromDate = document.getElementById('from-date');
    const toDate   = document.getElementById('to-date');  
    
    toDate.valueAsNumber = Date.now();   
    fromDate.valueAsNumber = toDate.valueAsNumber - 6 * 24 * 60 * 60 * 1000;

    fromDate.addEventListener('change', UpdateLoggedTime);
    toDate.addEventListener('change', UpdateLoggedTime);
}
