import { addTimespan, updateTimespan, 
         getWatchList, GetSelectedWatch, SetSelectedWatch,
         addWatch, validateNewWatchLabel, validateNewWatchColor,
         archiveWatch} from './data.js';
import { UpdateLoggedTime, InitSummary } from './summary.js';

var start_time = undefined;
var intervalId = undefined;
const nowatchlabel = '<span class="swatch"> </span> Select Watch ...';

function UpdateSelectedWatch(sw, shtml) {       
    document.querySelector('label[for="watch-select"]').innerHTML = shtml;    
    document.getElementById('startstop').disabled = !sw;
    document.getElementById('archive-watch').disabled = !sw;
}

function FillWatchList(itemtag = 'li') {
    getWatchList().then((items) => {
        console.log(items);
        const lst = document.getElementById('watch-list');
        lst.replaceChildren();
        let updatesel = true;

        if (items) {
            let sel = GetSelectedWatch();

            let frag = document.createDocumentFragment();
            for (let item of items) {
                let el = document.createElement(itemtag);
                if (item.description) {
                    el.title = item.description;
                }

                let swatch = document.createElement('span');
                swatch.innerHTML = '&#x25A0; ';
                swatch.style.setProperty('color', item.color);
                swatch.classList.add('swatch');            
                
                let lbl = document.createElement('span');
                lbl.innerText = item.title;
                lbl.value     = item._id;                
                lbl.classList.add('hover-hlit');
                lbl.addEventListener('click', (e) => {
                    SetSelectedWatch(item._id);
                    UpdateSelectedWatch(item._id, e.target.parentElement.innerHTML);
                    document.getElementById('watch-select').checked = false;
                });          

                el.appendChild(swatch);
                el.appendChild(lbl);

                if (sel == item._id) {
                    UpdateSelectedWatch(item._id, el.innerHTML);
                    updatesel = false;
                }

                frag.appendChild(el);
            }
            lst.appendChild(frag); 
            if (updatesel) {
                UpdateSelectedWatch(undefined, nowatchlabel);
            }
        }
    }).catch(error => console.log(`Error retrieving watch list ${error}`)); 
}

function StopWatch(ss, ts) {
    updateTimespan(GetSelectedWatch(), start_time, Date.now())
    .then(() => {
        UpdateLoggedTime();
    })
    .catch((error) => {
        alert(`Error updating time log ${error}`);
        UpdateLoggedTime(); //for the case ticks did log.
    });
    
    clearInterval(intervalId);
    ss.innerHTML = '&#x23F5;';
    ts.innerHTML = '00:00:00';
    ts.classList.remove('error');
    ts.title = '';       
    start_time   = undefined;

    document.getElementById('watch-select').disabled = false;
    document.getElementById('archive-watch').disabled = false;    
}

function Tick(ts) {
    let d = Date.now();
    updateTimespan(GetSelectedWatch(), start_time, d)
    .then(() => {
        let v = d - start_time;

        let hours = Math.floor(v / 3600000);
        v -= hours * 3600000;
        hours = hours < 10 ? '0' + hours : hours.toString();

        let mins = Math.floor(v / 60000);
        v -= mins * 60000;
        mins = mins < 10 ? '0' + mins : mins.toString();

        let secs = Math.floor(v / 1000);
        secs = secs < 10 ? '0' + secs : secs.toString();

        ts.innerHTML = `${hours}:${mins}:${secs}`; 
        ts.classList.remove('error');
        ts.title = '';       
    })
    .catch((error) => {
        ts.classList.add('error');
        ts.title = `Error updating time log ${error}`;
    });    
}

function StartWatch(ss, ts) {
    start_time = Date.now();
    addTimespan(GetSelectedWatch(), start_time)
    .then(() => {
        intervalId = setInterval(Tick, 1000, ts);
        ss.innerHTML = '&#x25A0;';

        document.getElementById('watch-select').disabled = true;
        document.getElementById('archive-watch').disabled = true;    
    })
    .catch((error) => {
        start_time = undefined;
        alert(`Unable to log starting time ${error}`);
    });
}

function ClearWatchToAdd() {
    const wt =  document.getElementById('watch-title');
    if (wt) {
        wt.value = '';
        wt.classList.remove('valid');
        wt.classList.add('invalid');
    }
    const wc = document.getElementById('watch-color');
    if (wc) {
        wc.value = '#ffffff';
        wc.classList.remove('valid');
        wc.classList.add('invalid');
    }    
    document.getElementById('watch-descr').value = '';
    document.getElementById('add-watch-ok').disabled = true;
}

function CloseWatchToAdd() {
    document.getElementById('watch-to-add').classList.remove('show');
}

function ValidateAddWatch() {
    document.getElementById('add-watch-ok').disabled = !(
        document.getElementById('watch-title').classList.contains('valid') 
     && document.getElementById('watch-color').classList.contains('valid')
    );
}

function OnWatchAttrValidation(aname, isvalid) {
    const cl = ['invalid', 'valid'];
    const el = document.getElementById(aname);
    el.classList.remove(cl[(Number(isvalid) + 1) % 2]);
    el.classList.add(cl[Number(isvalid)]);
    ValidateAddWatch();
}

window.onload = () => {    
    const timespan = document.getElementById('timespan');
    const startstop = document.getElementById('startstop');
    
    FillWatchList();
    const wl = document.getElementById('watch-list');
    wl.addEventListener('mouseleave', () => {
        document.getElementById('watch-select').checked = false;
    });
    wl.addEventListener('blur', () => {
        document.getElementById('watch-select').checked = false;
    });

    startstop.addEventListener('click', () => {   
        if (start_time) {     
            StopWatch(startstop, timespan);       
        } else {
            StartWatch(startstop, timespan);
        }
    });
    
    document.getElementById('add-watch').addEventListener('click', () => {
        document.getElementById('watch-to-add').classList.add('show');
    });

    document.getElementById('archive-watch').addEventListener('click', () => {
        archiveWatch(GetSelectedWatch())
        .then(() => {
            FillWatchList();
            UpdateLoggedTime();
        })
        .catch(error => console.log(`Error archiving watch ${error}`));
    });

    document.getElementById('watch-title').addEventListener('input', (e) => {
        if (e.target.value) {
            validateNewWatchLabel(e.target.value)
            .then(() => { 
                OnWatchAttrValidation('watch-title', true); 
            })
            .catch((error) => {
                console.log(error);
                OnWatchAttrValidation('watch-title', false);
            });            
        } else {
            OnWatchAttrValidation('watch-title', false);
        }        
    });

    document.getElementById('watch-color').addEventListener('change', (e) => {
        const val = e.target.value.toLowerCase();
        if ('#ffffff' == e.target.value) {
            OnWatchAttrValidation('watch-color', false);
        } else {
            validateNewWatchColor(val)
            .then(() => {
                OnWatchAttrValidation('watch-color', true);
            })
            .catch((error) => {
                console.log(error);
                OnWatchAttrValidation('watch-color', false);
            });            
        }        
    });

    document.getElementById('add-watch-ok').addEventListener('click', () => {
        const label = document.getElementById('watch-title').value;
        const color = document.getElementById('watch-color').value;
        const descr = document.getElementById('watch-descr').value;
        console.log(document.getElementById('watch-descr'));

        addWatch(label, color, descr)
        .then(() => FillWatchList())
        .catch(error => console.log(`Error adding new watch ${error}`));
        
        ClearWatchToAdd();        
        CloseWatchToAdd();
    });

    document.getElementById('add-watch-cancel').addEventListener('click', () => {
        ClearWatchToAdd();
        CloseWatchToAdd();
    });

    InitSummary();
}
