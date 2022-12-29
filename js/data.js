export function GetSelectedWatch() {
    return localStorage.getItem('selected_watch');
}

export function SetSelectedWatch(sw) {
    localStorage.setItem('selected_watch', sw);
}

export function validateNewWatchLabel(lbl) {    
    return ValidateNewWatchAttr('title_index', lbl);
}

export function validateNewWatchColor(clr) {    
    return ValidateNewWatchAttr('color_index', clr);
}

function getDB() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open('TimeLog'); //any version

        request.onerror = (ev) => {
            reject(this.error);            
        };

        request.onupgradeneeded = (ev) => {
            const db = ev.target.result;          

            db.onerror = (evnt) => {
                reject(new Error(`Error loading database: ${evnt.target.errorCode}`));                
            } 

            const watchlist = db.createObjectStore('watchlist', { keyPath: '_id', autoIncrement: true });
            watchlist.createIndex('title_index', 'title', { unique: true });
            watchlist.createIndex('color_index', 'color', { unique: true });
            watchlist.createIndex('active_index', 'active', { unique: false });

            const log = db.createObjectStore('log', { keyPath: ['watch_id', 'start']});
            log.createIndex('startstop_index', ['start', 'stop'], { unique: true });
            log.createIndex('watch_index', 'watch_id', { unique: false });              

/*
            log.transaction.oncomplete = (evnt) => {
                const txn = db.transaction(['watchlist', 'log'], 'readwrite');

                const wlos = txn.objectStore('watchlist');
                wlos.add({ title: 'First Test Watch', color: '#ff0000', active: 1});
                wlos.add({ title: 'Second Test Watch', color: '#00ff00', active: 1, description: 'I never make haste'});
                wlos.add({ title: 'Archived Watch', color: '#0000ff'});

                const los = txn.objectStore('log');
                const min_ms  = 1000 * 60;
                const hour_ms = min_ms * 60;
                const day_ms  = hour_ms * 24;            
                
                const days  = _RandomInt(1, 10);    
                const now   = Date.now();
            
                for (let d = days; d > -1; --d) {                    
                    let start = (new Date()).setHours(8, 0, 0, 0) - day_ms * d;
                    const stop = Math.min(start + 16 * hour_ms, now);                    
            
                    for (let cur = start + _RandomInt(0, 180) * min_ms; cur <= stop; cur += _RandomInt(0, 180) * min_ms) {
                        const watch = _RandomInt(1, 4);
                        los.put({ watch_id: watch, start: cur, stop: cur += _RandomInt(1, 120) * min_ms });
                     }
                }
            };
*/            
        };

        request.onsuccess = (ev) => {
            resolve(ev.target.result);
        }
    });
}

export function getWatchList(activeOnly = true) {
    return new Promise((resolve, reject) => {
        getDB().then((db) => {
            let ret = [];
            const txn = db.transaction('watchlist', 'readonly'); 
            const req = activeOnly ? txn.objectStore('watchlist').index('active_index').openCursor(1)
                                   : txn.objectStore('watchlist').openCursor();
            req.onsuccess = (ev) => {
                const cursor = ev.target.result;
                if (cursor) {
                    ret.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(ret);
                }
            }            
        }).catch(error => reject(error));
    });
}

export function addWatch(lbl, clr, dscr) {   
    return new Promise((resolve, reject) => {
        getDB().then((db) => {
            const txn = db.transaction('watchlist', 'readwrite', { durability: 'strict'});
            const ostore = txn.objectStore('watchlist');
            const res = ostore.add({title: lbl, color: clr, description: dscr, active: 1});
            res.onsuccess = () => {
                resolve();
            };
        }).catch(error => reject(error));
    });
}

export function archiveWatch(watchid) {
    return new Promise((resolve, reject) => {
        getDB().then((db) => {
            const txn = db.transaction('watchlist', 'readwrite', { durability: 'strict'});
            const ostore = txn.objectStore('watchlist');            
            const res = ostore.get(Number(watchid));
            res.onsuccess = (evt) => {
                let watchrec = evt.target.result;
                delete watchrec.active;                
                const pres = ostore.put(watchrec);
                pres.onsuccess = (e) => {                    
                    resolve();
                }
            };
        }).catch(error => reject(error));
    });
}

export function addTimespan(watchid, startTime) {
    return new Promise((resolve, reject) => {
        getDB().then((db) => {
            const txn = db.transaction('log', 'readwrite', { durability: 'strict'});
            const ostore = txn.objectStore('log');
            const res = ostore.add({ watch_id: watchid, start: startTime, stop: startTime });        
            res.onsuccess = () => {
                resolve();
            };
        }).catch(error => reject(error));
    });
}

export function updateTimespan(watchid, startTime, stopTime) {
    return new Promise((resolve, reject) => {
        getDB().then((db) => {
            const txn = db.transaction('log', 'readwrite', { durability: 'strict'});
            const ostore = txn.objectStore('log');
            const res = ostore.put({ watch_id: watchid, start: startTime, stop: stopTime });
            res.onsuccess = () => {
                resolve();
            };
        }).catch(error => reject(error));
    });
}

export function getData(fromDate, toDate) {
    return new Promise((resolve, reject) => {
        getDB().then((db) => {
            const txn = db.transaction('log', 'readonly');
            const index = txn.objectStore('log').index('startstop_index');
            const range = IDBKeyRange.bound([fromDate, fromDate], [toDate, toDate], false, true);            
            let ret = new Map();

            index.openCursor(range).onsuccess = (ev) => {
                const cursor = ev.target.result;     
                if (cursor) {
                    let v = ret.get(cursor.value.watch_id);
                    if (typeof(v) != 'number') {
                        v = 0;
                    }
                    ret.set(cursor.value.watch_id, v + cursor.value.stop - cursor.value.start);

                    cursor.continue();
                } else {
                    resolve(ret);
                }
            }
        }).catch(error => reject(error));
    });
}


function ValidateNewWatchAttr(indexname, val) {
    return new Promise((resolve, reject) => {
        getDB().then((db) => {
            const txn = db.transaction('watchlist', 'readonly');
            const index = txn.objectStore('watchlist').index(indexname);
            const res = index.get(val);
            res.onsuccess = () => {
                if (res.result) {
                    reject(new Error(`Value ${val} already exists`));
                } else {
                    resolve();
                }
            };                  
        }).catch(error => reject(error));

    });
}

function _RandomInt(minVal, maxVal) {
    do {
        let ret = Math.floor(Math.random() * maxVal);
        if (ret >= minVal) {
            return ret;
        }
    } while (true);
}
