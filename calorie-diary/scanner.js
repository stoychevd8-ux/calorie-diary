(function() {
  var codeReader = null, active = false;
  
  function ensureZXing() {
    return new Promise(function(resolve, reject) {
      if (window.ZXing) return resolve();
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/@zxing/library@latest';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  
  window.startBarcodeScan = function(onScan) {
    var video = document.getElementById('barcodeVideo'), status = document.getElementById('barcodeStatus');
    ensureZXing().then(function() {
      codeReader = new ZXing.BrowserMultiFormatReader();
      active = true;
      if (status) status.textContent = 'Point at a barcode...';
      codeReader.listVideoInputDevices().then(function(devices) {
        var rear = devices.find(function(d){ return /back|rear|environment/i.test(d.label); });
        var id = rear ? rear.deviceId : (devices[0] ? devices[0].deviceId : null);
        codeReader.decodeFromVideoDevice(id, video, function(res, err) {
          if (!active) return;
          if (res) {
            active = false; window.stopBarcodeScan();
            if (status) status.textContent = 'Found: ' + res.text;
            setTimeout(function() { onScan(res.text); }, 300);
          }
        });
      });
    }).catch(function() { if (status) status.textContent = 'Camera error.'; });
  };
  
  window.stopBarcodeScan = function() {
    active = false;
    if (codeReader) { try { codeReader.reset(); } catch(e){} codeReader = null; }
    if (document.getElementById('barcodeStatus')) document.getElementById('barcodeStatus').textContent = '';
  };
  
  window.lookupBarcode = function(barcode) {
    var url = 'https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(barcode) + '.json?fields=product_name,brands,nutriments,quantity';
    return fetch(url).then(function(r) { return r.json(); }).then(function(d) {
      if (d.status !== 1 || !d.product) return null;
      var p = d.product, n = p.nutriments || {};
      var kcal = n['energy-kcal_100g'];
      if (kcal == null && n['energy_100g'] != null) kcal = n['energy_100g'] / 4.184;
      return {
        name: (p.brands ? p.brands + ' - ' : '') + (p.product_name || '') + (p.quantity ? ' ('+p.quantity+')' : ''),
        kcal: kcal ? Math.round(kcal) : null,
        p: n.proteins_100g ? Math.round(n.proteins_100g*10)/10 : null,
        c: n.carbohydrates_100g ? Math.round(n.carbohydrates_100g*10)/10 : null,
        f: n.fat_100g ? Math.round(n.fat_100g*10)/10 : null,
        fib: n.fiber_100g ? Math.round(n.fiber_100g*10)/10 : null,
        sug: n.sugars_100g ? Math.round(n.sugars_100g*10)/10 : null,
        na: n.sodium_100g ? Math.round(n.sodium_100g*1000) : null
      };
    }).catch(function() { return null; });
  };
})();