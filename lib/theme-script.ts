/**
 * Applies the stored theme (or the system's) before the first paint, and
 * follows the system while no explicit choice has been made. Inline on
 * purpose: an external script would arrive after the wrong colours. The same
 * rule as applyTheme() in lib/prefs.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');function a(){var t=null;try{t=localStorage.getItem('theme')}catch(e){}var k=t==='dark'||(t!=='light'&&m.matches);d.classList.toggle('dark',k);d.style.colorScheme=k?'dark':'light'}a();m.addEventListener('change',a)})()`;
