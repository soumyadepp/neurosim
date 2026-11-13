<script lang="ts">
  import Brain from '@lucide/svelte/icons/brain';
  import { setTheme, ui } from '../../lib/engine.svelte';
  import { strings } from '../../lib/strings';

  const t = strings.theme;

  let osDark = $state(false);

  $effect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    osDark = mq.matches;
    const onchange = (e: MediaQueryListEvent) => (osDark = e.matches);
    mq.addEventListener('change', onchange);
    return () => mq.removeEventListener('change', onchange);
  });

  const dark = $derived(ui.theme ? ui.theme === 'dark' : osDark);
</script>

<button
  class="sleep"
  class:dark
  type="button"
  role="switch"
  aria-checked={dark}
  aria-label={dark ? t.toLight : t.toDark}
  title={dark ? t.toLight : t.toDark}
  onclick={() => setTheme(dark ? 'light' : 'dark')}
>
  <span class="sky" aria-hidden="true">
    <i class="star a"></i><i class="star b"></i><i class="star c"></i>
    <i class="sun"></i>
  </span>
  <span class="knob" aria-hidden="true">
    <Brain size={13} strokeWidth={2.2} />
    <span class="zz">z<small>z</small></span>
  </span>
</button>

<style>
  .sleep {
    position: relative; width: 58px; height: 30px; padding: 0; flex: none;
    border: 1px solid var(--line-strong); border-radius: 999px; cursor: pointer;
    background: linear-gradient(105deg, #fdf0d5 0%, #cfe3f8 100%);
    transition: background .35s ease, border-color .35s ease;
    overflow: hidden;
  }
  .sleep.dark { background: linear-gradient(105deg, #0d1322 0%, #1b2740 100%); border-color: #30487a; }
  .sleep:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

  .sky { position: absolute; inset: 0; }
  .sun {
    position: absolute; right: 7px; top: 7px; width: 9px; height: 9px; border-radius: 50%;
    background: #f3b02c; box-shadow: 0 0 6px rgba(243, 176, 44, .8);
    transition: opacity .3s, transform .3s;
  }
  .dark .sun { opacity: 0; transform: scale(.4); }
  .star { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: #cdd8f0; opacity: 0; transition: opacity .4s; }
  .star.a { left: 10px; top: 8px; }
  .star.b { left: 18px; top: 17px; width: 1.5px; height: 1.5px; }
  .star.c { left: 26px; top: 6px; width: 1.5px; height: 1.5px; }
  .dark .star { opacity: 1; animation: twinkle 2.4s ease-in-out infinite; }
  .dark .star.b { animation-delay: .8s; }
  .dark .star.c { animation-delay: 1.5s; }
  @keyframes twinkle { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }

  .knob {
    position: absolute; left: 2px; top: 2px; width: 24px; height: 24px; border-radius: 50%;
    display: grid; place-items: center;
    background: #fff; color: #b4600a; box-shadow: 0 1px 3px rgba(40, 30, 10, .3);
    transition: transform .3s cubic-bezier(.3, 1.3, .5, 1), background .35s, color .35s, box-shadow .35s;
  }
  .dark .knob {
    transform: translateX(28px);
    background: #233250; color: #9db8ec;
    box-shadow: 0 0 10px rgba(76, 132, 232, .7), 0 1px 3px rgba(0, 0, 0, .5);
  }
  .zz {
    position: absolute; right: -1px; top: -7px; font-size: 8px; font-weight: 700; line-height: 1;
    color: #9db8ec; opacity: 0; transition: opacity .35s; font-family: var(--display); font-style: italic;
  }
  .zz small { font-size: 6px; margin-left: .5px; }
  .dark .zz { opacity: 1; animation: drift 2.6s ease-in-out infinite; }
  @keyframes drift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }

  @media (prefers-reduced-motion: reduce) {
    .sleep, .knob, .sun, .star, .zz { transition: none; animation: none !important; }
    .dark .star, .dark .zz { opacity: 1; }
  }
</style>
