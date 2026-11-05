(function() {
  var codeReader = null, active = false;
  var currentStream = null;
  var torchOn = false;
  
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
      torchOn = false;
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
        
        // Grab the video track for the flashlight
        setTimeout(function() {
          if (video.srcObject) {
            currentStream = video.srcObject;
          }
        }, 1000);

      });
    }).catch(function() { if (status) status.textContent = 'Camera error.'; });
  };
  
  window.stopBarcodeScan = function() {
    active = false;
    if (codeReader) { try { codeReader.reset(); } catch(e){} codeReader = null; }
    if (currentStream) { currentStream.getTracks().forEach(function(t) { t.stop(); }); currentStream = null; }
    torchOn = false;
    if (document.getElementById('barcodeStatus')) document.getElementById('barcodeStatus').textContent = '';
  };

  window.toggleFlashlight = function() {
    if (!currentStream) return;
    var track = currentStream.getVideoTracks()[0];
    if (!track) return;
    
    try {
      var caps = track.getCapabilities();
      if (caps.torch) {
        torchOn = !torchOn;
        track.applyConstraints({ advanced: [{ torch: torchOn }] });
      } else {
        alert("Flashlight not supported on this camera/browser.");
      }
    } catch(e) {
      console.log("Flashlight error", e);
    }
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
        kcal: kcal ? Math.round(kcal) : 0,
        p: n.proteins_100g ? Math.round(n.proteins_100g*10)/10 : 0,
        c: n.carbohydrates_100g ? Math.round(n.carbohydrates_100g*10)/10 : 0,
        f: n.fat_100g ? Math.round(n.fat_100g*10)/10 : 0,
        fib: n.fiber_100g ? Math.round(n.fiber_100g*10)/10 : 0,
        sug: n.sugars_100g ? Math.round(n.sugars_100g*10)/10 : 0,
        na: n.sodium_100g ? Math.round(n.sodium_100g*1000) : 0
      };
    }).catch(function() { return null; });
  };
})();
