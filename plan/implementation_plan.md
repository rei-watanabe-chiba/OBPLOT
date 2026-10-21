# Implementation Plan: 初回起動の高速化（選択肢2＋選択肢3のハイブリッド最適化）

## 1. `src/gas/CoreAction.html`

### Target: `CoreAct.connectApp` (Lines 120-123)

#### Replace From (Lines 120-123)
```javascript
        State.set(statPath, ["loading", "環境確認中..."]);
        const targetShts = GLB.schema[cfg.schemaKey].map(s => s.name);
        const curShts = await API.getWbState(ssId, targetShts);
```

#### Replace To
```javascript
        State.set(statPath, ["loading", "環境確認中..."]);
        const targetShts = GLB.schema[cfg.schemaKey].filter(s => s.validRule).map(s => s.name);
        const curShts = await API.getWbState(ssId, targetShts);
```

---

## 2. `src/gas/Tracer5i_App.html`

### Target 1: `ENTAct.initDB`, `ENTAct.syncTrcDB`, `ENTAct.runExtr` (Lines 220-291)

#### Replace From (Lines 220-291)
```javascript
    static async initDB() {
      State.set("ENTST.PREF.status", ["loading", "初期データ読込中..."]);
      try {
        const [pData, wData, cData] = await CoreAct.ensureFetch(ENTAct.ssId, [GLB.rawShts.tracer5i, GLB.rawShts.wdxrf, GLB.appShts.crct]);
        State.set({
          "ENTST.ASGN.data.rawTrcDT": pData || null,
          "ENTST.ASGN.data.rawWdxrfDT": wData || null,
          "ENTST.ASGN.data.crctDT": cData || []
        });
        if (pData?.length > 1 && wData?.length > 1) {
          ENTAct.syncTrcDB(pData, wData, false);
        }
      } finally {
        State.set("ENTST.PREF.status", ["hidden", ""]);
      }
    }
    static syncTrcDB(pData, wData = State.get("ENTST.ASGN.data.rawWdxrfDT"), showStatus = true) {
      if (!pData || pData.length <= 1 || !wData || wData.length <= 1) {
        State.set("ENTST.ASGN.data.rawTrcDT", pData || null);
        return;
      }
      const { pxrfDT: wrapPXRF, wdxrfDT: wrapWDXRF, dbs } = CoreMethod.Util.genDB(pData, wData, { mixWD: true });
      const { ASGN, CALB, STDZ } = State.proxy.ENTST;
      State.set({
        "ENTST.ASGN.data": { ...ASGN.data, rawTrcDT: pData, rawWdxrfDT: wData, wrapPXRF, wrapWDXRF },
        "ENTST.ASGN.refs": { ...ASGN.refs, available: dbs, filter: dbs },
        "ENTST.CALB.refs": { ...CALB.refs, modeMap: [...GLB.optElms], calElms: [...GLB.valElms] },
        "ENTST.STDZ.refs": { ...STDZ.refs, modeMap: [...GLB.optElms] },
        ...(showStatus && { "ENTST.ASGN.status": ["message", `対象database: ${dbs.length}件`] })
      });
    }
    static async runExtr() {
      State.set("GLB.isLocked", true);
      State.set("ENTST.EXTR.status", ["loading", "データ確認・抽出中..."]);
      let chkRes, extrDT, vFileDT, trcDT;
      try {
        const [fRes, rRes, tRes] = await API.pullMult(ENTAct.ssId, [
          { sht: GLB.appShts.filelist, qCol: 5, lCol: 5 },
          { sht: GLB.rawShts.results },
          { sht: GLB.rawShts.tracer5i }
        ]);
        if (!fRes.success) throw new Error(fRes.msg);
        if (!rRes.success) throw new Error(rRes.msg);
        const diRes = await ENTAct.stateDI(fRes.pld.data, "extract");
        vFileDT = diRes.outDT;
        if (diRes.isErr) {
          await API.pushDT(ENTAct.ssId, GLB.appShts.filelist, vFileDT, "rule");
          State.set("GLB.isLocked", false);
          return;
        }
        extrDT = Mtd.ENT.genExtr(vFileDT, rRes.pld.data, State.get("ENTST.EXTR.refs"));
        if (!extrDT || extrDT.length <= 1) throw new Error("対象データなし");
        trcDT = (tRes?.success && tRes.pld?.data) ? tRes.pld.data : [CoreMethod.Util.genHeader('tracer5i')];
        chkRes = Mtd.ENT.valdPxrf(trcDT, extrDT);
      } catch (e) {
        State.set("ENTST.EXTR.status", ["error", e.message]);
        State.set("GLB.isLocked", false);
        return;
      }
      State.set({ "ENTST.EXTR.status": ["hidden", ""], "GLB.isLocked": false });
      const msg = chkRes.isDup ? "重複IDがあります。上書き格納しますか？" : "tracer5iシートに格納しますか？";
      await CoreAct.withAsync("ENTST.EXTR.status", msg, async () => {
        const pRes = await API.pushMult(ENTAct.ssId, [
          { sht: GLB.appShts.filelist, data: vFileDT, opts: "rule" },
          { sht: GLB.rawShts.tracer5i, data: chkRes.isDup ? chkRes.data : extrDT.slice(1), opts: chkRes.isDup ? "clear" : ["append"] }
        ]);
        const errRes = pRes?.find(r => !r.success);
        if (errRes) throw new Error(errRes.msg);
        const finalTrcDT = chkRes.isDup ? chkRes.data : [...trcDT, ...extrDT.slice(1)];
        let wData = State.get("ENTST.ASGN.data.rawWdxrfDT");
        if (!wData || wData.length <= 1) {
          const [fetchedW] = await CoreAct.ensureFetch(ENTAct.ssId, [GLB.rawShts.wdxrf]);
          wData = fetchedW || null;
        }
        ENTAct.syncTrcDB(finalTrcDT, wData, true);
        State.set("ENTST.phase", ENT_PHS.OUTPUT);
        return `格納完了: ${extrDT.length - 1} 件`;
      });
    }
```

#### Replace To
```javascript
    static syncTrcDB(pData, wData = State.get("ENTST.ASGN.data.rawWdxrfDT"), cData = null) {
      const { ASGN, CALB, STDZ } = State.proxy.ENTST;
      const nextCrct = cData !== null ? cData : (ASGN.data.crctDT || []);
      if (!pData || pData.length <= 1 || !wData || wData.length <= 1) {
        State.set({
          "ENTST.ASGN.data": { ...ASGN.data, rawTrcDT: pData || null, rawWdxrfDT: wData || null, crctDT: nextCrct }
        });
        return;
      }
      const { pxrfDT: wrapPXRF, wdxrfDT: wrapWDXRF, dbs } = CoreMethod.Util.genDB(pData, wData, { mixWD: true });
      State.set({
        "ENTST.ASGN.data": { ...ASGN.data, rawTrcDT: pData, rawWdxrfDT: wData, crctDT: nextCrct, wrapPXRF, wrapWDXRF },
        "ENTST.ASGN.refs": { ...ASGN.refs, available: dbs, filter: dbs },
        "ENTST.CALB.refs": { ...CALB.refs, modeMap: [...GLB.optElms], calElms: [...GLB.valElms] },
        "ENTST.STDZ.refs": { ...STDZ.refs, modeMap: [...GLB.optElms] },
        "ENTST.ASGN.status": ["message", `対象database: ${dbs.length}件`]
      });
    }
    static async runExtr() {
      State.set("GLB.isLocked", true);
      State.set("ENTST.EXTR.status", ["loading", "データ確認・抽出中..."]);
      let chkRes, extrDT, vFileDT, trcDT, wData, cData;
      try {
        const cachedW = State.get("ENTST.ASGN.data.rawWdxrfDT");
        const needInitDB = !cachedW || cachedW.length <= 1;
        const reqs = [
          { sht: GLB.appShts.filelist, qCol: 5, lCol: 5 },
          { sht: GLB.rawShts.results },
          { sht: GLB.rawShts.tracer5i },
          ...(needInitDB ? [{ sht: GLB.rawShts.wdxrf }, { sht: GLB.appShts.crct }] : [])
        ];
        const [fRes, rRes, tRes, wRes, cRes] = await API.pullMult(ENTAct.ssId, reqs);
        if (!fRes.success) throw new Error(fRes.msg);
        if (!rRes.success) throw new Error(rRes.msg);
        const diRes = await ENTAct.stateDI(fRes.pld.data, "extract");
        vFileDT = diRes.outDT;
        if (diRes.isErr) {
          await API.pushDT(ENTAct.ssId, GLB.appShts.filelist, vFileDT, "rule");
          State.set("GLB.isLocked", false);
          return;
        }
        extrDT = Mtd.ENT.genExtr(vFileDT, rRes.pld.data, State.get("ENTST.EXTR.refs"));
        if (!extrDT || extrDT.length <= 1) throw new Error("対象データなし");
        trcDT = (tRes?.success && tRes.pld?.data) ? tRes.pld.data : [CoreMethod.Util.genHeader('tracer5i')];
        wData = needInitDB ? ((wRes?.success && wRes.pld?.data) ? wRes.pld.data : null) : cachedW;
        cData = needInitDB ? ((cRes?.success && cRes.pld?.data) ? cRes.pld.data : []) : null;
        chkRes = Mtd.ENT.valdPxrf(trcDT, extrDT);
      } catch (e) {
        State.set("ENTST.EXTR.status", ["error", e.message]);
        State.set("GLB.isLocked", false);
        return;
      }
      State.set({ "ENTST.EXTR.status": ["hidden", ""], "GLB.isLocked": false });
      const msg = chkRes.isDup ? "重複IDがあります。上書き格納しますか？" : "tracer5iシートに格納しますか？";
      await CoreAct.withAsync("ENTST.EXTR.status", msg, async () => {
        const pRes = await API.pushMult(ENTAct.ssId, [
          { sht: GLB.appShts.filelist, data: vFileDT, opts: "rule" },
          { sht: GLB.rawShts.tracer5i, data: chkRes.isDup ? chkRes.data : extrDT.slice(1), opts: chkRes.isDup ? "clear" : ["append"] }
        ]);
        const errRes = pRes?.find(r => !r.success);
        if (errRes) throw new Error(errRes.msg);
        const finalTrcDT = chkRes.isDup ? chkRes.data : [...trcDT, ...extrDT.slice(1)];
        ENTAct.syncTrcDB(finalTrcDT, wData, cData);
        State.set("ENTST.phase", ENT_PHS.OUTPUT);
        return `格納完了: ${extrDT.length - 1} 件`;
      });
    }
```

### Target 2: `TrcInit.start` (Lines 420-430)

#### Replace From (Lines 420-430)
```javascript
      State.subscribe("ENTST.ASGN.data.pxrfDT", () => ENTAct.renewENTState());
      State.subscribe("ENTST.SYMB.refs.baseKey", () => ENTAct.renewENTState());
      State.subscribe("ENTST.SYMB.refs.rls", () => ENTAct.renewENTState());
      const hooks = { onBeforeInit: () => ENTAct.initDB() };
      const ssId = window.__INITIAL_SSID__ || "EXCEL_LOCAL_RUN";
      CoreAct.actvTab('entry');
      const initCfg = CoreAct.cfgRslv('entry');
      await CoreAct.startSession(ssId, false, hooks, initCfg);
    }
  }
```

#### Replace To
```javascript
      State.subscribe("ENTST.ASGN.data.pxrfDT", () => ENTAct.renewENTState());
      State.subscribe("ENTST.SYMB.refs.baseKey", () => ENTAct.renewENTState());
      State.subscribe("ENTST.SYMB.refs.rls", () => ENTAct.renewENTState());
      const hooks = {};
      const ssId = window.__INITIAL_SSID__ || "EXCEL_LOCAL_RUN";
      CoreAct.actvTab('entry');
      const initCfg = CoreAct.cfgRslv('entry');
      await CoreAct.startSession(ssId, false, hooks, initCfg);
    }
  }
```
