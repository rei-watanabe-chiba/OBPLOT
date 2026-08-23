# SYSTEM DIRECTIVE: STRICT NAMING CONVENTION MASTER

## 1. GLOBAL SCOPE (Module Interoperability & Namespace)
**[Objective]** Maintain class hierarchies and modularity. Allow verb duplication across different namespaces (e.g., `T1Ctrl.load` and `T2Ctrl.load`) while keeping property/method names highly concise and domain-specific.
**[Format]** `Namespace` . `Verb (Max 5 chars)` + `Domain Noun`

### 1-1. Reserved Namespaces (Strictly Enforced)
- `GLB`: Global constants and app states.
- `T1` / `T2`: Pure functions and Event routing logic for Tab1/Tab2.
- `T1Ctrl` / `T2Ctrl` / `CoreCtrl`: Controller layer functions.
- `Mtd`: Method layer (Domain logic & Math).
- `Evt`: Event routing layer.
- `UI`: View and DOM manipulation layer.
- `API`: External GasService communication.

### 1-2. Allowed Verbs (Do NOT use 'get' or 'set' to avoid DOM conflicts)
- `load` (Load/Acquire inner data)
- `fetch` (Fetch external API data)
- `build` (Construct objects/arrays)
- `gen` (Generate rows/DOM elements)
- `renew` (Update states/UI phases)
- `run` (Execute pipeline/process)
- `calc` (Mathematical calculations)
- `check` (Validation/Duplication check)
- `vald` (Format/Rule validation)
- `tgl` (Toggle UI/States)

### 1-3. Reserved Domain Nouns
**[Data Sources & Managers]**
- `pxrf` / `wdxrf`: Reserved strictly for data originating from the respective sheets.
- `DB`: Universal abbreviation for dataset/dataBase/dset.
- `mgmtDT`: DataManager equivalent.
- `mgmPrev`: PreviewManager equivalent.

**[Functional Sections]**
- `pref` (Config/Preferences)
- `raw` (Raw file data)
- `extr` (Extracted data)
- `asgn` (Assigned DB data)
- `symb` (Symbol config)
- `prev` (Preview rendering)
- `repo` (Report generation)

**[General Concepts]**
- `Conf`, `Phs` (Phase), `Elm` (Element), `Lgc` (Logic), `Opt` (Option), `Vald` (Validator), `Calc`, `List`, `Corr` (Correction), `Stats`.

### 1-4. DOM ID Suffixes
- Use strictly: `Sec` (Section), `Box` (Box - kept as is), `Btn` (Button), `Area` (Area - kept as is), `Bar` (StatusBar).

---

## 2. LOCAL SCOPE: Extreme Compression (Consonant Extraction)
**[Objective]** Prevent catastrophic conflicts with external libraries (e.g., ECharts) and DOM properties by shrinking local variables, loop counters, and arguments inside methods.
**[Rule]** Remove vowels to create the shortest identifiable consonant clusters. NEVER use `shape`, `color`, `value`, or `option` as variable names.

### Reserved Local Abbreviations:
- **Values/Indexes**: `v` (micro scope), `val` (normal scope), `idx` (index).
- **DOM/Structure**: `cntr` (container), `cnt` (content), `hdr` (header), `sum` (summary).
- **Styling/Config**: `shp` (shape), `clr` (color), `opt` / `opts` (option/s), `rl` / `rls` (rule/s), `pfx` (prefix).
- **Execution**: `elm` (element), `res` (result), `mch` (match), `fml` (formula), `itv` (interval), `cur` (current).

---

## 3. LOCAL SCOPE: Data Entity Identifiers
**[Objective]** Visually distinguish core business logic data structures (arrays, objects) from temporary variables or flags.
**[Rule]** Suffix domain abbreviations with `DT` (Data Table/Type).

### Standard Implementations:
- Use for primary datasets: e.g., `statsDT`, `prevDT`, `plotDT`, `corrDT`, `pxrfDT`, `wdxrfDT`, `shtDT`.
- **[STRICT EXCEPTIONS]**: Must use `wrapPXRF` (for merged PXRF data) and `wrapWDXRF` (for WDXRF Object arrays). Do not use `DT` for these two.
- **[MAINTAINED]**: Keep `fileDT` and `rawDT` as is.

---

## 4. LOCAL SCOPE: State and Flag Identifiers
**[Objective]** Clarify the intent of boolean conditional branches.
**[Rule]** Use exact prefixes (`is`, `has`, `use`) combined with short nouns or adjectives.

### Prefix Guidelines & Reserved Flags:
- **`is` (State/Property)**: `isListMod` (File list edited/modified), `isDis` (Disabled), `isShow` (Visible), `isOpen`, `isCheck`, `isDup`, `isAllPos`.
- **`has` (Possession/Inclusion)**: `hasRefErr` (Contains reference errors), `hasEmpty`, `hasClr` (Has color definition).
- **`use` (Feature Toggle)**: `useLOD` (LOD replacement active), `useCal` (Calibration applied).

---

## 5. EXCEPTIONS & EXEMPTIONS
**[Math & Iterators]**
- Keep math standard variables exactly as they are: `x`, `y`, `m`, `b`, `n`, `r`, `r2`.
- Keep regression terms: `slope`, `intercept`.
- Keep chart rendering terms: `niceMin`, `niceMax`, `niceTicks`.
- Keep 1-char standard iterators in micro-scopes: `r` (row), `d` (data), `p` (point), `e` (event), `err` (error).
- Domain specific element shortcuts: `ob` (obsidian), `md` (mudrock).
