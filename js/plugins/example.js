/* Example plugin — not loaded by default.
   Copy and add: <script src="js/plugins/example.js"></script> after main.js
*/
WP.hook('afterRender', function(session){
  const bar=document.querySelector('.topbar');
  if(!bar || document.getElementById('wpVer')) return;
  const s=document.createElement('span');
  s.id='wpVer';
  s.className='muted';
  s.style.fontSize='.72rem';
  s.textContent='v'+WP.version;
  bar.appendChild(s);
});
