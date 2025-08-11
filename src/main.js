// attaching main stylesheet
const style = document.createElement("link");
style.rel = "stylesheet";
style.href = "/style.css";
document.head.appendChild(style);

const rootEl = document.getElementById("App");

// enable helper with timeout
const withTimeout = (p, ms = 4000) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

// theme helpers
function themeGet(){ return document.documentElement.getAttribute("data-theme") || "light"; }
function themeSet(mode){ document.documentElement.setAttribute("data-theme", mode); try{ localStorage.setItem("ff-theme", mode); }catch{} }

(() => {

  // Intro splash (showing animated logo, then reveal app)
  (function intro(){
    const d = document.documentElement;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    d.classList.add('intro');

    const ov = document.createElement('div'); ov.id = 'ff-intro';
    const logo = document.createElement('div'); logo.className = 'ff-logo';
    ov.appendChild(logo);
    (document.body ? document.body : document.documentElement).appendChild(ov);

    const close = () => {
      ov.classList.add('fade');
      setTimeout(()=>{
        ov.remove();
        d.classList.remove('intro');
        d.classList.add('ready');
      }, 520);
    };

    if (reduce) { close(); return; }
    setTimeout(close, 1100);
  })();

  // Font families and variants
  const RAW = [
    "Roboto","OpenSans","Lato","Montserrat","Poppins","SourceSans3",
    "WorkSans","Raleway","PlayfairDisplay","PTSerif","Oswald",
    "Karla","VarelaRound","Rubik","Bitter","Arvo","BebasNeue",
    "Alegreya","NunitoSans","Pacifico","Spectral","LibreBaskerville",
    "Tinos","TitilliumWeb","Exo2","Heebo","Cairo","NotoSans","AbrilFatface",
    "Aldrich","AlegreyaSans","Arimo","Assistant","BadScript","Baloo2","Barlow",
    "Cardo","Caveat","Chewy","Cinzel","ComicNeue","Courgette","DancingScript",
    "DMSans","DMSerifDisplay","EBGaramond","FanwoodText","FiraCode","FjallaOne",
    "Fredoka","JetBrainsMono","Jost","Lobster","MochiyPopPOne","Newsreader",
    "Overpass","PathwayGothicOne","Prompt","Quattrocento",
    "QuattrocentoSans","Questrial","Rosario","Sacramento","Sarabun","SpaceGrotesk",
    "Tajawal","Tangerine","Ubuntu","ArchivoNarrow", "Cabin", "Asap", "Signika", "MerriweatherSans", 
    "Delius", "EmilysCandy"
  ];
  const FAMILIES = Array.from(new Set(RAW));

  const VARS = [
    { id:"regular",     file:f=>`${f}-Regular.ttf`,    weight:400, style:"normal", tag:"Regular" },
    { id:"italic",      file:f=>`${f}-Italic.ttf`,     weight:400, style:"italic", tag:"Italic" },
    { id:"bold",        file:f=>`${f}-Bold.ttf`,       weight:700, style:"normal", tag:"Bold" },
    { id:"bolditalic",  file:f=>`${f}-BoldItalic.ttf`, weight:700, style:"italic", tag:"BoldItalic" },
  ];
  const pickVar = id => VARS.find(v => v.id === id);

  const FONT_BASE = "fonts";
  const PLACEHOLDER = "Type your example text here with quick jazz flow for display.";
  const DEFAULT_SIZE = 70;

  // Category sets for filtering
  const CATS = {
    Academic: new Set(["MerriweatherSans","EBGaramond","LibreBaskerville","Spectral","PTSerif","Cardo","Newsreader","Quattrocento","Rosario","Tinos"]),
    Headline: new Set(["AbrilFatface","Signika", "EmilysCandy","BebasNeue","FjallaOne","PathwayGothicOne","PlayfairDisplay","Cinzel","Aldrich","ArchivoNarrow"]),
    UI_Text: new Set(["MerriweatherSans","Cabin","Asap", "Signika","Roboto","OpenSans","SourceSans3","WorkSans","Lato","Montserrat","Poppins","Sarabun","Overpass","Jost","QuattrocentoSans","Questrial"]),
    Fun_Playful: new Set(["Fredoka","VarelaRound","Baloo2","Lobster","BadScript","Caveat","Chewy","Courgette","DancingScript","Pacifico","Tangerine","MochiyPopPOne"]),
    Editorial: new Set(["MerriweatherSans","Newsreader","PlayfairDisplay","EBGaramond","Spectral","LibreBaskerville", "Cabin"]),
    Coding_Mono: new Set(["FiraCode","JetBrainsMono"]),
    Condensed: new Set(["Oswald","PathwayGothicOne","ArchivoNarrow","FjallaOne","Signika"]),
    Geometric: new Set(["Poppins","Montserrat","Jost","SpaceGrotesk","Questrial","Aldrich"]),
    Rounded: new Set(["VarelaRound","Fredoka","Baloo2","Asap", "Delius"]),
    Friendly: new Set(["Cairo","Cabin", "Asap", "Signika","Delius","Tajawal","Heebo","NotoSans"]),
    Luxury: new Set(["PlayfairDisplay","Cinzel","AbrilFatface","DMSerifDisplay","EmilysCandy"]),
    Retro: new Set(["Bitter","Arvo","Rubik","ComicNeue","EmilysCandy"]),
  };

  // Small text utils
  const ABC = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const el=(t,c,h)=>{const e=document.createElement(t); if(c) e.className=c; if(h!==undefined) e.innerHTML=h; return e;};
  const safe=(fn,fb)=>{try{return fn();}catch{return fb;}};
  const next=(ch,d)=>{const i=ABC.indexOf(ch); if(i<0) return ch; const L=ABC.length; return ABC[(i+d+L)%L];};
  const isEditable=n=>n&&(n.nodeType===3||(n.nodeType===1 && n.isContentEditable));
  const replaceAt=(s,i,ch)=> (i<0||i>=s.length)?s : s.slice(0,i)+ch+s.slice(i+1);

  // mapping mouse coordinates to cursor position on editable element
  function caretAt(root,x,y){
    const doc=root.ownerDocument;
    if(doc.caretPositionFromPoint){const p=doc.caretPositionFromPoint(x,y); if(p&&p.offsetNode) return {node:p.offsetNode,offset:p.offset};}
    if(doc.caretRangeFromPoint){const r=doc.caretRangeFromPoint(x,y); if(r&&r.startContainer) return {node:r.startContainer,offset:r.startOffset};}
    return null;
  }

  // Converting a (node, offset) caret to absolute index within root
  function absIndex(editEl,node,offset){
    const w=document.createTreeWalker(editEl,NodeFilter.SHOW_TEXT,null);
    let i=0, ok=false; while(w.nextNode()){const t=w.currentNode; if(t===node){i+=offset; ok=true; break;} else {i+=t.nodeValue.length;}}
    return ok?i:null;
  }

  // tiny toast message
  let toastEl=null, toastTimer=null;
  function note(msg){
    if(!toastEl){ toastEl=el("div","ff-toast"); document.body.appendChild(toastEl); }
    toastEl.textContent=msg; toastEl.className="ff-toast show";
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove("show"), 2200);
  }

  // Loading fonts dynamically and inject @font-face rules
  class Loader{
    constructor(base){
      this.base=base; this.loaded=new Map();
      this.styleEl=el("style"); document.head.appendChild(this.styleEl);
    }
    url(f,fn){ return `${this.base}/${f}/${fn}`; }
    async tryOne(f,v){
      const url=this.url(f,v.file(f));
      const face=new FontFace(f, `url("${url}")`, {style:v.style,weight:String(v.weight),display:"swap"});
      try{
        await withTimeout(face.load(), 4000);
        document.fonts.add(face);
        if(!this.loaded.has(f)) this.loaded.set(f,[]);
        this.loaded.get(f).push({id:v.id,weight:v.weight,style:v.style,tag:v.tag,url});
        const rule=`@font-face{font-family:"${f}";src:url("${url}") format("truetype");font-style:${v.style};font-weight:${v.weight};font-display:swap;}`;
        this.styleEl.sheet.insertRule(rule, this.styleEl.sheet.cssRules.length);
        return true;
      }catch{ return false; }
    }
    async loadFam(f){ const rs=await Promise.all(VARS.map(v=>this.tryOne(f,v))); return rs.some(Boolean); }
    has(f,id){ const vs=this.loaded.get(f)||[]; return vs.some(v=>v.id===id); }
    styleFor(id){ const v=pickVar(id); return {weight:v.weight, style:v.style}; }
    tags(f){ const vs=this.loaded.get(f)||[]; return vs.map(v=>v.tag).join(" • "); }
  }

  // Reactive UI state seting
  const state = {
    size: DEFAULT_SIZE,
    text: PLACEHOLDER,
    fam: null, weight: 400, style: "normal",
    history: [],
    want: "any",
    cats: new Set(),
    q: ""
  };

  // Main application
  class App{
    constructor(fams){
      this.fams=fams; this.loader=new Loader(FONT_BASE);
      this.root=el("div","ff-app"); document.body.appendChild(this.root);
      this.top(); this.preview(); this.browser(); this.history(); this.boot();
    }

    // Theme switcher UI
    themeBar(){
      const bar = el("div","ff-theme-bar");
      const ico = el("span","ff-theme-icon", themeGet()==="dark" ? "🌙" : "☀️");
      const sw = el("input","ff-theme-toggle"); sw.type="checkbox";
      const saved = safe(()=>localStorage.getItem("ff-theme"), null);
      if(saved) themeSet(saved);
      sw.checked = themeGet()==="dark";
      sw.addEventListener("change",()=>{
        const mode = sw.checked ? "dark" : "light";
        themeSet(mode); ico.textContent = mode==="dark" ? "🌙" : "☀️";
      });
      bar.append(ico, sw);
      return bar;
    }

    // Header, filters, history button
    top(){
      const wrap=el("div","ff-top");
      const id=el("section","ff-card ff-ident");
      const row=el("div","ff-ident-top");
      row.append(el("div","ff-logo"), (()=>{const t=el("div",""); t.append(el("h3","ff-title","Font Fountain"), el("p","ff-slogan","See letters flow — listen to voice of letters.")); return t;})());
      id.append(row);

      const right=el("section","ff-card ff-right");
      const bar=el("div","ff-right-top");
      const btnFilters=el("button","ff-btn filters","Filters ▾");
      const btnHist=el("button","ff-btn","History");
      this._btnHist = btnHist;
      const theme = this.themeBar();
      bar.append(btnFilters, btnHist, theme);
      right.append(bar);

      const coll=el("div","ff-filters");
      const inner=el("div","ff-filter-inner");
      right.append(coll); coll.append(inner);

      const allKeys = Object.keys(CATS);
      const tags = el("div","ff-tags");
      allKeys.forEach(k=>{
        const label = k.replace("_"," / ");
        const tag = el("button","ff-tag", label);
        tag.addEventListener("click", ()=>{
          tag.classList.toggle("active");
          if(tag.classList.contains("active")) state.cats.add(k);
          else state.cats.delete(k);
          this.refresh();
        });
        tags.append(tag);
      });
      inner.append(tags);

      const clear=el("button","ff-btn","Clear");
      clear.addEventListener("click",()=>{
        state.cats.clear();
        inner.querySelectorAll(".ff-tag.active").forEach(t=>t.classList.remove("active"));
        this.refresh();
      });
      inner.append(clear);

      const toggle = (open)=>{
        if(open){ coll.classList.add("open"); coll.style.maxHeight = inner.scrollHeight + 16 + "px"; }
        else{ coll.style.maxHeight = "0px"; coll.classList.remove("open"); }
      };
      btnFilters.addEventListener("click",()=>{
        const open = !coll.classList.contains("open");
        toggle(open);
      });
      window.addEventListener("resize",()=>{ if(coll.classList.contains("open")) coll.style.maxHeight = inner.scrollHeight + 16 + "px"; });

      btnHist.addEventListener("click",()=> this.historyToggle());

      wrap.append(id,right);
      this.root.append(wrap);
    }

    // editable preview area, size and variant controls
    preview(){
      const col=el("section","ff-col ff-preview");

      const tb=el("div","ff-toolbar");
      const lbl=el("span","small","Size");
      const rng=el("input","ff-slider"); rng.type="range"; rng.min="28"; rng.max="120"; rng.value=String(state.size);
      const px=el("span","small px", `${state.size}px`);
      rng.addEventListener("input",()=>{ state.size=parseInt(rng.value,10); px.textContent=`${state.size}px`; this.apply(); });

      const mk=(id,txt)=>{ const b=el("button","ff-btn",txt); b.dataset.variant=id; b.addEventListener("click",()=>this.varSet(id,b)); return b; };
      this.varBtns=[ mk("regular","Regular"), mk("italic","Italic"), mk("bold","Bold"), mk("bolditalic","BoldItalic") ];

      tb.append(lbl,rng,px, ...this.varBtns);

      const spacer = el("div","ff-spacer");
      tb.append(spacer);

      const btnReset = el("button","ff-btn","Reset Text");
      btnReset.addEventListener("click",()=>{
        state.text = PLACEHOLDER;
        this.previewRef.ph.textContent = PLACEHOLDER;
        this.syncSamples();
      });
      tb.append(btnReset);

      col.append(tb);

      const editor=el("div","ff-editor");
      this.info=el("div","ff-info","—");
      const ph=el("div","ff-placeholder"); ph.contentEditable="true"; ph.spellcheck=false; ph.textContent=state.text;
      ph.addEventListener("input",()=>{ state.text=ph.textContent||""; this.syncSamples(); });

      // Scrolling over a letter to cycle characters
      editor.addEventListener("wheel",(ev)=>{
        ev.preventDefault();
        const p=caretAt(ph,ev.clientX,ev.clientY); if(!p) return;
        let n=p.node; if(n.nodeType===1 && n.childNodes.length){ n=n.childNodes[0]; if(!n||n.nodeType!==3) return; }
        if(!isEditable(n)) return;
        const idx=absIndex(ph,n,p.offset); if(idx==null) return;
        const s=ph.textContent||""; if(!s.length) return;
        const delta=ev.deltaY>0?1:-1; const target=Math.min(Math.max(idx-1,0), s.length-1);
        const ch=s[target]; const rep=next(ch,delta); if(rep===ch) return;

        const ns=replaceAt(s,target,rep);
        ph.textContent=ns; state.text=ns; this.syncSamples();

        try{
          const range = document.createRange();
          const walker = document.createTreeWalker(ph, NodeFilter.SHOW_TEXT, null);
          let acc=0, found=null, off=0;
          while(walker.nextNode()){
            const t=walker.currentNode, len=t.nodeValue.length;
            if(acc+len>target){ found=t; off=target-acc; break; }
            acc+=len;
          }
          if(found){
            range.setStart(found, off); range.setEnd(found, off+1);
            const span = document.createElement("span");
            span.className = "glyph-flash";
            range.surroundContents(span);
            setTimeout(()=>{ const parent=span.parentNode; if(!parent) return;
              while(span.firstChild) parent.insertBefore(span.firstChild, span);
              span.remove();
            }, 350);
          }
        }catch{}

        safe(()=>{ const r=document.createRange(); const sel=window.getSelection();
          let acc=0,node=null,off=0,w=document.createTreeWalker(ph,NodeFilter.SHOW_TEXT,null);
          while(w.nextNode()){const t=w.currentNode,len=t.nodeValue.length;
            if(acc+len>=target+1){ node=t; off=(target+1)-acc; break; } acc+=len; }
          if(node){ r.setStart(node,off); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
        });
      },{passive:false});

      editor.append(this.info, ph, el("div","ff-hint","Type to edit - Scroll over a letter to round glyphs"));
      col.append(editor);
      this.root.append(col);

      this.previewRef={ph, rng, px};
    }

    // Font search-list column
    browser(){
      const col = el("section","ff-col ff-browser");
      const search = el("div","ff-search");
      const input  = el("input"); input.type="text"; input.placeholder = "Search fonts…";
      const clear  = el("button","clear-btn","Clear");

      let t=null;
      input.addEventListener("input", ()=>{
        clearTimeout(t);
        t=setTimeout(()=>{
          state.q = input.value || "";
          this.refresh();
        }, 80);
      });
      clear.addEventListener("click", ()=>{
        input.value=""; state.q=""; this.refresh(); input.focus();
      });

      search.append(input, clear);
      col.append(search);

      const list = el("div","ff-list");
      col.append(list);
      this.root.append(col);
      this.listEl = list;
    }

    // history panel shell
    history(){
      const p=el("div","ff-history");
      p.append(el("div","title","Recent previews"), el("div","ff-list"));
      document.body.appendChild(p);
      this.histPanel=p; this.histList=p.querySelector(".ff-list");

      document.addEventListener("click",(e)=>{
        if(!this.histPanel.classList.contains("open")) return;
        const within = this.histPanel.contains(e.target) || (this._btnHist && this._btnHist.contains(e.target));
        if(!within) this.histPanel.classList.remove("open");
      });
      document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") this.histPanel.classList.remove("open"); });
    }

    // Open-close history near the button
    historyToggle(){
      if(!this._btnHist) return;
      const r = this._btnHist.getBoundingClientRect();
      const top = r.bottom + 8 + window.scrollY;
      const left = Math.min(r.left, window.innerWidth - this.histPanel.offsetWidth - 16) + window.scrollX;
      this.histPanel.style.top = `${top}px`;
      this.histPanel.style.left = `${left}px`;
      this.histPanel.classList.toggle("open");
    }

    // Loading fonts, picking first available, then rendering
    async boot(){
      this.renderSkeleton();
      for(const f of this.fams){
        await this.loader.loadFam(f);
        this.upsertItem(f);
        if(!state.fam && this.loader.loaded.has(f)){ this.select(f, {skipMove:true}); }
      }
      this.refresh();
      this.syncSamples();
    }

    // placeholder list while loading
    renderSkeleton(){
      this.listEl.innerHTML="";
      for(const f of this.fams){
        const item=el("div","ff-item"); item.dataset.family=f;
        const name=el("div","name",f);
        const sub=el("div","sub","loading…");
        const sample=el("div","sample","—");
        item.append(name, sub, sample);
        item.addEventListener("click",()=>this.select(f));
        this.listEl.append(item);
      }
    }

    // Updating a list row after fonts are loaded
    upsertItem(f){
      const item=this.listEl.querySelector(`.ff-item[data-family="${f}"]`); if(!item) return;
      const info=this.loader.loaded.get(f), name=item.querySelector(".name"), sub=item.querySelector(".sub");
      if(info && info.length){
        name.style.fontFamily=`"${f}", system-ui, sans-serif`;
        sub.textContent=this.loader.tags(f);
        item.classList.remove("disabled");
      } else {
        sub.textContent="not found"; item.classList.add("disabled"); item.style.opacity=.5; item.style.pointerEvents="none";
      }
    }

    // Filter, search, repaint samples
    refresh(){
      const cats = state.cats;
      const q = (state.q || "").trim().toLowerCase();

      this.listEl.querySelectorAll(".ff-item").forEach(item=>{
        const f = item.dataset.family;
        if(!this.loader.loaded.has(f)){ item.style.display="none"; return; }

        let ok=true; for(const c of cats){ if(!(CATS[c] && CATS[c].has(f))){ ok=false; break; } }
        if(!ok){ item.style.display="none"; return; }

        if(q && !f.toLowerCase().includes(q)){ item.style.display="none"; return; }

        item.style.display="";

        const nameEl = item.querySelector(".name");
        if(nameEl){
          const txt = f;
          if(q){
            const i = txt.toLowerCase().indexOf(q);
            if(i>=0){
              nameEl.innerHTML = txt.substring(0,i) + `<span class="ff-hit">${txt.substring(i, i+q.length)}</span>` + txt.substring(i+q.length);
            }else{
              nameEl.textContent = txt;
            }
          }else{
            nameEl.textContent = txt;
          }
        }
      });

      this.renderSamples();
    }

    // Changing variant preference (regular/bold/italic)
    varSet(id,btn){
      state.want=id;
      this.varBtns.forEach(b=>b.classList.toggle("active", b===btn));
      this.refresh();

      const fam=state.fam;
      if(fam && !this.loader.has(fam,id)){
        note(`${fam} doesn't include ${pickVar(id).tag}. Showing closest available style.`);
        this.pickClosest(fam);
      }else if(fam){
        const v=pickVar(id); state.weight=v.weight; state.style=v.style;
      }
      this.apply(); this.pushHist();
    }

    // using nearest available style if exact is missing
    pickClosest(fam){
      const variants=this.loader.loaded.get(fam)||[];
      const order=["regular","italic","bold","bolditalic"];
      for(const pid of order){ if(variants.some(v=>v.id===pid)){ const v=pickVar(pid); state.weight=v.weight; state.style=v.style; break; } }
    }

    // animating selected row to top of visible list
    moveToTop(family){
      const list = this.listEl;
      const item = list.querySelector(`.ff-item[data-family="${family}"]`);
      if(!item) return;
      const first = list.querySelector(".ff-item:not([style*='display: none'])");
      if(first && first === item) return;
      const start = item.getBoundingClientRect();
      list.insertBefore(item, list.firstChild);
      const end = item.getBoundingClientRect();
      const dy = start.top - end.top;
      item.style.willChange = "transform";
      item.style.transform = `translateY(${dy}px)`;
      item.style.transition = "transform .28s ease";
      requestAnimationFrame(()=>{ item.style.transform = "translateY(0)"; });
      item.addEventListener("transitionend", ()=>{ item.style.transform=""; item.style.transition=""; item.style.willChange=""; }, {once:true});
      list.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Picking a font family
    select(f, opts={}){
      if(!this.loader.loaded.has(f)) return;
      state.fam=f;

      if(state.want!=="any" && this.loader.has(f, state.want)){
        const v=pickVar(state.want); state.weight=v.weight; state.style=v.style;
      }else{
        if(state.want!=="any" && !this.loader.has(f, state.want)){
          note(`${f} doesn't include ${pickVar(state.want).tag}. Showing closest available style.`);
        }
        this.pickClosest(f);
      }

      this.apply();
      this.markActive();
      this.pushHist();

      if(!opts.skipMove) this.moveToTop(f);
    }

    // Applying current state to preview text
    apply(){
      const fam = state.fam ? `"${state.fam}", system-ui, sans-serif` : "system-ui, sans-serif";
      const ph=this.previewRef.ph;
      ph.style.fontFamily=fam; ph.style.fontWeight=String(state.weight); ph.style.fontStyle=state.style; ph.style.fontSize=state.size+"px";
      this.info.textContent = state.fam ? `${state.fam} • ${state.weight} • ${state.style}` : "—";
      this.renderSamples();
    }

    // Marking active font row
    markActive(){ this.listEl.querySelectorAll(".ff-item").forEach(i=>i.classList.toggle("active", i.dataset.family===state.fam)); }

    // History: keep one entry per family, move to top if revisited
    pushHist(){
      const snap = { family: state.fam, weight: state.weight, style: state.style, text: state.text };
      const existingIndex = state.history.findIndex(h => h.family === snap.family);
      if (existingIndex !== -1) state.history.splice(existingIndex, 1);
      state.history.unshift({ ...snap, time: Date.now() });
      if (state.history.length > 150) state.history.pop();
      this.renderHist();
    }

    // Rendering history items with font-styled sample text
    renderHist(){
      this.histList.innerHTML = "";
      for (const h of state.history) {
        const item = el("div", "ff-item");
        item.style.fontFamily = `"${h.family}", system-ui, sans-serif`;

        const nameDiv = el("div", "name", h.family);
        const subDiv = el("div", "sub", `${h.weight} • ${h.style}`);

        const sampleDiv = el("div", "sample", h.text || PLACEHOLDER);
        sampleDiv.style.fontFamily = `"${h.family}", system-ui, sans-serif`;
        sampleDiv.style.fontWeight = h.weight;
        sampleDiv.style.fontStyle = h.style;

        item.addEventListener("click", () => {
          state.fam = h.family;
          state.weight = h.weight;
          state.style = h.style;
          state.text = h.text;
          this.previewRef.ph.textContent = h.text;
          this.apply();
          this.markActive();
        });

        item.append(nameDiv, subDiv, sampleDiv);
        this.histList.append(item);
      }
    }

    // sample style for list tiles
    styleFor(f){
      const want=state.want;
      if(want!=="any" && this.loader.has(f, want)) return this.loader.styleFor(want);
      return this.loader.styleFor("regular");
    }

    // Update all visible samples with current text
    renderSamples(){
      this.listEl.querySelectorAll(".ff-item").forEach(item=>{
        const f=item.dataset.family; const s=item.querySelector(".sample");
        s.textContent = state.text || "";
        const st=this.styleFor(f);
        s.style.fontFamily = `"${f}", system-ui, sans-serif`;
        s.style.fontWeight = String(st.weight);
        s.style.fontStyle = st.style;
      });
    }
    syncSamples(){ this.renderSamples(); }
  }

  // Booting the app
  window.addEventListener("DOMContentLoaded", ()=> new App(FAMILIES));
})();
