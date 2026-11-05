(function () {
  var MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  var KEY = 'calorie-diary-v6';
  var DEFAULT_GOALS = { cal: 2200, p: 140, c: 250, f: 70, w: 2000, fi: 30, su: 50, na: 2300 };
  
  var state = { 
    entries: [], 
    goals: Object.assign({}, DEFAULT_GOALS), 
    weights: {}, 
    water: {}, 
    plan: { mode: 'maintain', sex: 'male', age: '25', height: '175', weight: '75', activity: '1.55', target: '' }, 
    name: '', 
    setupDone: false 
  };
  
  var picked = null, day = new Date();
  day.setHours(12, 0, 0, 0); // Prevent timezone bugs

  var FOODS = `Apple|52|0.3|14|0.2
Banana|89|1.1|23|0.3
Orange|47|0.9|12|0.1
Strawberries|32|0.7|7.7|0.3
Chicken breast|165|31|0|3.6
Ground beef|250|26|0|15
Salmon|206|22|0|12
Egg, whole|143|12.6|0.7|9.5
Milk, whole|61|3.2|4.8|3.3|ml
Greek yogurt|85|9.5|4|3.5
Feta cheese|264|14|4|21
White rice|130|2.7|28|0.3
Pasta|158|5.8|31|0.9
Oats|389|17|66|7
Bread, white|265|9|49|3.2
Banitsa|300|9|28|17
Shopska salad|85|3|5|6
Olive oil|884|0|0|100|ml
Potato|87|1.9|20|0.1
Avocado|160|2|9|15
Almonds|579|21|22|50
Peanut butter|588|25|20|50
Cola|42|0|10.6|0|ml
Orange juice|45|0.7|10.4|0.2|ml
Beer|43|0.5|3.6|0|ml
Red wine|85|0.1|2.6|0|ml
Latte|40|2|3.5|2|ml`.trim().split('\n').map(function (l) {
    var p = l.split('|'); return [p[0], +p[1], +p[2], +p[3], +p[4], p[5] || 'g'];
  });

  function $(id) { return document.getElementById(id); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function getLocalDateStr(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s) { Object.assign(state, s); if(!state.entries.length) seed(); }
      else seed();
    } catch (e) { seed(); }
  }
  
  function seed() {
    var today = getLocalDateStr(new Date());
    state.entries = [
      { id: '1', date: today, meal: 'Breakfast', name: 'Oatmeal with banana', cal: 310, p: 9, c: 58, f: 5, fi: 5, su: 14, na: 120 },
      { id: '2', date: today, meal: 'Lunch', name: 'Chicken and rice bowl', cal: 640, p: 46, c: 72, f: 14, fi: 4, su: 3, na: 780 }
    ];
  }

  function getEmoji(name) {
    name = name.toLowerCase();
    if(name.includes('chicken') || name.includes('steak') || name.includes('beef') || name.includes('pork')) return '🥩';
    if(name.includes('salad') || name.includes('broccoli') || name.includes('spinach')) return '🥗';
    if(name.includes('apple') || name.includes('banana') || name.includes('berry')) return '🍎';
    if(name.includes('pizza') || name.includes('burger')) return '🍕';
    if(name.includes('rice') || name.includes('pasta') || name.includes('bread')) return '🍚';
    if(name.includes('coffee') || name.includes('tea') || name.includes('juice')) return '☕';
    if(name.includes('egg')) return '🥚';
    if(name.includes('milk') || name.includes('yogurt') || name.includes('cheese')) return '🥛';
    return '🍽️';
  }

  function render() {
    var ds = getLocalDateStr(day);
    var list = state.entries.filter(function (e) { return e.date === ds; });
    var sum = function(key) { return list.reduce(function(a, e){ return a + (e[key] || 0); }, 0); };
    var eaten = sum('cal'), g = state.goals, left = g.cal - eaten;

    $('leftNum').textContent = Math.abs(left);
    $('leftLbl').textContent = left < 0 ? 'over' : 'kcal left';
    $('goalNum').textContent = g.cal;
    $('eatenNum').textContent = eaten;
    
    var pct = Math.min(eaten / g.cal, 1);
    $('ringBar').setAttribute('stroke-dashoffset', String(314.16 * (1 - pct)));
    $('ring').classList.toggle('over', left < 0);

    var macros = [
      { id: 'p', val: sum('p'), goal: g.p, unit: 'g' },
      { id: 'c', val: sum('c'), goal: g.c, unit: 'g' },
      { id: 'f', val: sum('f'), goal: g.f, unit: 'g' },
      { id: 'su', val: sum('su'), goal: g.su, unit: 'g' },
      { id: 'na', val: sum('na'), goal: g.na, unit: 'mg' }
    ];
    
    macros.forEach(function(m) {
      var textEl = $(m.id + 'Text');
      var fillEl = $(m.id + 'Fill');
      if (textEl && fillEl) {
        textEl.textContent = Math.round(m.val) + ' / ' + m.goal + m.unit;
        fillEl.style.width = Math.min(m.val / m.goal, 1) * 100 + '%';
      }
    });

    var mealsEl = $('meals'); mealsEl.innerHTML = '';
    MEALS.forEach(function (meal) {
      var items = list.filter(function (e) { return e.meal === meal; });
      var sec = document.createElement('div'); sec.className = 'meal-section';
      var head = document.createElement('div'); head.className = 'meal-header';
      var h = document.createElement('h2'); h.textContent = meal;
      var addBtn = document.createElement('button'); addBtn.className = 'add-pill'; addBtn.innerHTML = '+ Add'; 
      addBtn.onclick = function() { openAdd(meal); };
      
      head.appendChild(h); head.appendChild(addBtn); sec.appendChild(head);
      
      if (items.length) {
        var card = document.createElement('div'); card.className = 'card'; card.style.padding = '0 20px';
        items.forEach(function (e) {
          var row = document.createElement('div'); row.className = 'entry';
          row.innerHTML = '<div class="entry-img">' + getEmoji(e.name) + '</div><div class="entry-info"><h3>' + e.name + '</h3><p>P ' + e.p + ' · C ' + e.c + ' · F ' + e.f + '</p></div><div class="entry-cal">' + e.cal + '</div>';
          var del = document.createElement('button'); del.className = 'del-btn'; del.innerHTML = '✕';
          del.onclick = function() { state.entries = state.entries.filter(function(x){return x.id !== e.id;}); save(); render(); };
          row.appendChild(del); card.appendChild(row);
        });
        sec.appendChild(card);
      }
      mealsEl.appendChild(sec);
    });

    var strip = $('dateStrip'); strip.innerHTML = '';
    var today = new Date();
    for (var i = -3; i <= 3; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      var localDS = getLocalDateStr(d);
      var b = document.createElement('button'); 
      b.className = 'day-btn' + (localDS === ds ? ' active' : '');
      b.innerHTML = d.toLocaleDateString('en-US', { weekday: 'narrow' }) + '<b>' + d.getDate() + '</b>';
      (function(dateObj) {
        b.onclick = function() { day = dateObj; day.setHours(12,0,0,0); render(); };
      })(d);
      strip.appendChild(b);
    }

    var w = state.water[ds] || 0;
    $('waterTxt').textContent = w + ' / ' + g.w + ' ml';
    $('waterFill').style.width = Math.min(w / g.w, 1) * 100 + '%';
    $('wInput').value = state.weights[ds] || '';
    drawWeightChart();
  }

  function drawWeightChart() {
    var keys = Object.keys(state.weights).sort();
    if (keys.length < 2) { $('wChart').innerHTML = ''; return; }
    var min = Math.min(...keys.map(k=>state.weights[k])) - 1;
    var max = Math.max(...keys.map(k=>state.weights[k])) + 1;
    var pts = keys.map(function(k, i) {
      var x = (i / (keys.length - 1)) * 300 + 10;
      var y = 90 - ((state.weights[k] - min) / (max - min)) * 80;
      return x + ',' + y;
    }).join(' ');
    $('wChart').innerHTML = '<polyline fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="' + pts + '"/>';
  }

  function openAdd(meal) {
    $('addOverlay').hidden = false;
    $('fName').value = ''; $('fCal').value = ''; $('fPro').value = ''; $('fCarb').value = ''; $('fFat').value = ''; $('fFib').value = ''; $('fSug').value = ''; $('fSodium').value = ''; $('fGrams').value = '100';
    $('picked').hidden = true; $('results').hidden = true; $('addErr').textContent = '';
    picked = null;
    var sel = $('fMeal'); sel.innerHTML = '';
    MEALS.forEach(function(m) { var o = document.createElement('option'); o.value = m; o.textContent = m; if(m===meal) o.selected=true; sel.appendChild(o); });
  }

  $('fSearch').addEventListener('input', function() {
    var q = this.value.toLowerCase().trim(), box = $('results');
    if (q.length < 2) { box.hidden = true; return; }
    var hits = FOODS.filter(function(f) { return f[0].toLowerCase().includes(q); }).slice(0, 5);
    box.innerHTML = '';
    if (!hits.length) {
      box.innerHTML = '<div style="padding:16px;font-size:14px;color:var(--ink-2);text-align:center;">No matches.</div>';
    } else {
      hits.forEach(function(f) {
        var b = document.createElement('button'); b.className = 'result'; b.type = 'button';
        b.innerHTML = '<span>' + f[0] + '</span><small>' + f[1] + ' kcal</small>';
        b.onclick = function() {
          picked = f; box.hidden = true; $('fSearch').value = '';
          $('picked').hidden = false; $('pickedName').textContent = f[0]; $('pickedPer').textContent = 'Per 100' + f[5] + ': ' + f[1] + ' kcal';
          $('fGrams').value = 100;
          applyGrams();
        };
        box.appendChild(b);
      });
    }
    box.hidden = false;
  });

  function applyGrams() {
    if (!picked) return;
    var g = parseFloat($('fGrams').value) || 0;
    var r = g / 100;
    $('fName').value = picked[0] + ' (' + g + (picked[5] || 'g') + ')';
    $('fCal').value = Math.round(picked[1] * r);
    $('fPro').value = Math.round(picked[2] * r * 10) / 10;
    $('fCarb').value = Math.round(picked[3] * r * 10) / 10;
    $('fFat').value = Math.round(picked[4] * r * 10) / 10;
  }
  $('fGrams').addEventListener('input', applyGrams);

  $('scanStartBtn').onclick = function() {
    $('scanPanel').hidden = false;
    window.startBarcodeScan(function(code) {
      window.lookupBarcode(code).then(function(prod) {
        $('scanPanel').hidden = true;
        if (!prod) { alert('Barcode not found. Enter manually.'); $('fName').value = code; return; }
        
        // Map to internal picked format so the gram slider works
        picked = [prod.name, prod.kcal, prod.p, prod.c, prod.f, 'g'];
        $('picked').hidden = false; 
        $('pickedName').textContent = prod.name; 
        $('pickedPer').textContent = 'Per 100g: ' + prod.kcal + ' kcal';
        
        if(prod.fib) $('fFib').value = prod.fib;
        if(prod.sug) $('fSug').value = prod.sug;
        if(prod.na) $('fSodium').value = prod.na;
        
        $('fGrams').value = 100;
        applyGrams();
      });
    });
  };

  $('addForm').onsubmit = function(e) {
    e.preventDefault();
    var name = $('fName').value, cal = parseFloat($('fCal').value);
    if (!name || isNaN(cal)) { $('addErr').textContent = 'Name and Calories are required.'; return; }
    state.entries.push({
      id: Date.now().toString(), date: getLocalDateStr(day), meal: $('fMeal').value,
      name: name, cal: cal, 
      p: parseFloat($('fPro').value)||0, c: parseFloat($('fCarb').value)||0, f: parseFloat($('fFat').value)||0,
      fi: parseFloat($('fFib').value)||0, su: parseFloat($('fSug').value)||0, na: parseFloat($('fSodium').value)||0
    });
    save(); $('addOverlay').hidden = true; render();
  };

  $('wPlus').onclick = function() { var ds = getLocalDateStr(day); state.water[ds] = (state.water[ds]||0) + 250; save(); render(); };
  $('wMinus').onclick = function() { var ds = getLocalDateStr(day); state.water[ds] = Math.max((state.water[ds]||0) - 250, 0); save(); render(); };
  $('wSave').onclick = function() { var ds = getLocalDateStr(day); var v = parseFloat($('wInput').value); if(v) { state.weights[ds] = v; save(); render(); } };

  $('navDiary').onclick = $('navDiary2').onclick = function() { $('screenDiary').hidden = false; $('screenPlan').hidden = true; };
  $('navPlan').onclick = $('navPlan2').onclick = function() { $('screenDiary').hidden = true; $('screenPlan').hidden = false; };

  $('openGoals').onclick = function() {
    $('gCal').value = state.goals.cal; $('gPro').value = state.goals.p; $('gCarb').value = state.goals.c; $('gFat').value = state.goals.f;
    $('gWater').value = state.goals.w; $('gFib').value = state.goals.fi; $('gSug').value = state.goals.su; $('gSodium').value = state.goals.na;
    $('goalsOverlay').hidden = false;
  };
  
  $('goalsForm').onsubmit = function(e) {
    e.preventDefault();
    state.goals = { cal: +$('gCal').value, p: +$('gPro').value, c: +$('gCarb').value, f: +$('gFat').value, w: +$('gWater').value, fi: +$('gFib').value, su: +$('gSug').value, na: +$('gSodium').value };
    save(); $('goalsOverlay').hidden = true; render();
  };

  // ---- PLAN TAB LOGIC ----
  var MODE_HINTS = { cut: 'Eat below maintenance to lose fat.', maintain: 'Eat at maintenance to hold your weight.', bulk: 'Eat above maintenance to gain weight.' };
  document.querySelectorAll('#modeSeg .tab').forEach(function(t) {
    t.onclick = function() {
      document.querySelectorAll('#modeSeg .tab').forEach(function(x){x.setAttribute('aria-selected', 'false');});
      this.setAttribute('aria-selected', 'true');
      state.plan.mode = this.getAttribute('data-mode');
      $('modeHint').textContent = MODE_HINTS[state.plan.mode];
      updatePlan();
    };
  });

  function updatePlan() {
    var age = +$('pAge').value, w = +$('pWeight').value, h = +$('pHeight').value, act = +$('pActivity').value;
    
    // Safety checks
    if (age < 14 || age > 100 || w < 30 || w > 300 || h < 120 || h > 250) {
        $('planResult').innerHTML = '<p class="hint" style="color: var(--bad);">Please enter valid limits (Age 14-100, Weight 30-300, Height 120-250).</p>';
        $('savePlanBtn').style.display = 'none';
        return;
    }

    var bmr = 10*w + 6.25*h - 5*age + ($('pSex').value === 'male' ? 5 : -161);
    var tdee = bmr * act;
    var target = state.plan.mode === 'cut' ? tdee - 500 : state.plan.mode === 'bulk' ? tdee + 300 : tdee;
    
    $('planResult').innerHTML = '<div style="font-size:14px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Daily Target</div><div style="font-size:48px;font-family:var(--font-display);font-weight:800; color:var(--ink);line-height:1;">' + Math.round(target) + '</div><div style="font-size:14px;font-weight:600;color:var(--ink-2);margin-top:4px;">kcal / day</div>';
    
    $('savePlanBtn').style.display = 'block';
  }

  $('savePlanBtn').onclick = function() {
    var bmr = 10*(+$('pWeight').value) + 6.25*(+$('pHeight').value) - 5*(+$('pAge').value) + ($('pSex').value === 'male' ? 5 : -161);
    var tdee = bmr * (+$('pActivity').value);
    var targetCal = state.plan.mode === 'cut' ? tdee - 500 : state.plan.mode === 'bulk' ? tdee + 300 : tdee;
    
    state.goals.cal = Math.round(targetCal);
    state.goals.p = Math.round(targetCal * 0.3 / 4);
    state.goals.c = Math.round(targetCal * 0.4 / 4);
    state.goals.f = Math.round(targetCal * 0.3 / 9);
    
    state.plan.age = $('pAge').value; state.plan.weight = $('pWeight').value; state.plan.height = $('pHeight').value; state.plan.activity = $('pActivity').value; state.plan.sex = $('pSex').value;
    
    save(); render();
    alert("Plan saved and calorie goals updated!");
  };

  $('pAge').addEventListener('input', updatePlan); $('pWeight').addEventListener('input', updatePlan); $('pHeight').addEventListener('input', updatePlan); $('pActivity').addEventListener('change', updatePlan); $('pSex').addEventListener('change', updatePlan);

  // ---- SETUP WIZARD LOGIC ----
  var wizStep = 1;
  window.selectWizMode = function(mode) {
    document.querySelectorAll('#modeCards .wiz-opt').forEach(function(b){ b.setAttribute('aria-selected', 'false'); });
    document.querySelector('#modeCards [data-mode="'+mode+'"]').setAttribute('aria-selected', 'true');
    state.plan.mode = mode;
  };
  
  window.selectWizAct = function(act) {
    document.querySelectorAll('#actCards .wiz-opt').forEach(function(b){ b.setAttribute('aria-selected', 'false'); });
    document.querySelector('#actCards [data-act="'+act+'"]').setAttribute('aria-selected', 'true');
    state.plan.activity = act;
  };

  function calcWizPreview() {
      var weight = +$('wWeight').value || 70;
      var height = +$('wHeight').value || 175;
      var age = +$('wAge').value || 25;
      var act = +state.plan.activity || 1.55;
      var bmr = 10*weight + 6.25*height - 5*age + ($('wSex').value === 'male' ? 5 : -161);
      var tdee = bmr * act;
      
      var rateVal = parseFloat($('wRate').value) || 0.5;
      var targetW = parseFloat($('wTarget').value) || weight;
      
      var targetCal = tdee;
      if (state.plan.mode === 'cut') targetCal = tdee - (rateVal * 1100);
      else if (state.plan.mode === 'bulk') targetCal = tdee + (rateVal * 1100);
      
      var floor = $('wSex').value === 'female' ? 1200 : 1500;
      if (targetCal < floor) targetCal = floor;
      
      $('wizPreview').innerHTML = '<div style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;">Estimated Target</div><div style="font-size:32px;font-family:var(--font-display);font-weight:800; color:var(--ink);margin-top:4px;">' + Math.round(targetCal) + ' kcal</div>';
      
      var weeks = 0;
      var diff = Math.abs(targetW - weight);
      if (diff > 0 && rateVal > 0 && state.plan.mode !== 'maintain') {
          weeks = Math.ceil(diff / rateVal);
      }
      
      if (weeks > 0) {
          $('timelineDiv').innerHTML = '<div style="margin-top: 12px; font-size: 14px; font-weight: 600; color: var(--ink-2);">⏱ Approx. <b>' + weeks + ' weeks</b> to reach ' + targetW + ' kg</div>';
      } else {
          $('timelineDiv').innerHTML = '';
      }
  }

  $('wRate').addEventListener('input', calcWizPreview);
  $('wTarget').addEventListener('input', calcWizPreview);

  function setWizStep(n) {
    wizStep = n;
    document.querySelectorAll('.wiz-step').forEach(function(s){ s.hidden = true; });
    $('step' + n).hidden = false;
    $('wizProgress').style.width = (n / 4 * 100) + '%';
    $('wizBack').disabled = n === 1;
    $('wizNext').textContent = n === 4 ? 'Start Tracking' : 'Continue';
    
    if (n === 2) {
      $('wSex').value = state.plan.sex || 'male';
      $('wAge').value = state.plan.age || '';
      $('wWeight').value = state.plan.weight || '';
      $('wHeight').value = state.plan.height || '';
    }
    if (n === 4) {
      var currentW = +$('wWeight').value;
      var targetInput = $('wTarget');
      if (!targetInput.value && currentW) {
        if (state.plan.mode === 'cut') targetInput.value = (currentW - 5).toFixed(1);
        else if (state.plan.mode === 'bulk') targetInput.value = (currentW + 5).toFixed(1);
        else targetInput.value = currentW.toFixed(1);
      }
      calcWizPreview();
    }
  }

  $('wizNext').onclick = function() {
    if (wizStep < 4) { 
      if (wizStep === 2) {
        var age = +$('wAge').value, w = +$('wWeight').value, h = +$('wHeight').value;
        if (age < 14 || age > 100 || w < 30 || w > 300 || h < 120 || h > 250) {
            $('wizErr').textContent = 'Please enter valid limits (Age 14-100, Weight 30-300, Height 120-250).';
            return;
        }
        state.plan.sex = $('wSex').value; state.plan.age = $('wAge').value; state.plan.weight = $('wWeight').value; state.plan.height = $('wHeight').value;
      }
      $('wizErr').textContent = '';
      setWizStep(wizStep + 1); 
    } else { 
      state.name = $('nameInput').value; 
      state.setupDone = true; 
      
      var bmr = 10*(+state.plan.weight) + 6.25*(+state.plan.height) - 5*(+state.plan.age) + (state.plan.sex === 'male' ? 5 : -161);
      var tdee = bmr * (+state.plan.activity);
      var rate = parseFloat($('wRate').value) || 0.5;
      var targetCal = state.plan.mode === 'cut' ? tdee - (rate * 1100) : state.plan.mode === 'bulk' ? tdee + (rate * 1100) : tdee;
      
      state.goals.cal = Math.round(targetCal);
      state.goals.p = +$('wPro').value || Math.round(targetCal * 0.3 / 4);
      state.goals.c = +$('wCarb').value || Math.round(targetCal * 0.4 / 4);
      state.goals.f = +$('wFat').value || Math.round(targetCal * 0.3 / 9);
      state.goals.w = +$('wWater').value || 2000;

      save(); 
      $('screenSetup').hidden = true; 
      $('screenDiary').hidden = false; 
      render();
    }
  };
  $('wizBack').onclick = function() { if (wizStep > 1) setWizStep(wizStep - 1); };

  load(); render();
  
  $('nameForm').onsubmit = function(e) {
    e.preventDefault();
    var n = $('nameInput').value.trim();
    if(!n) { $('nameErr').textContent = 'Enter a name'; return; }
    state.name = n;
    $('screenWelcome').hidden = true;
    $('screenSetup').hidden = false;
    setWizStep(1);
  };
  
  if (state.setupDone) {
    $('screenWelcome').hidden = true;
    $('screenDiary').hidden = false;
  } else {
    $('screenWelcome').hidden = false;
  }
})();
