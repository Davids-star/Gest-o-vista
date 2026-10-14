<template>
  <div class="min-h-dvh w-screen bg-[#070a0e] text-white flex items-center justify-center p-4 font-sans">
    <div class="w-full max-w-lg bg-[#0d121c] border-2 border-emerald-500/50 rounded-2xl p-6 space-y-5">
      <div class="text-center space-y-1">
        <h1 class="text-2xl font-black uppercase tracking-wider">GP Totem</h1>
        <p class="text-sm text-slate-400">Aplicativo do operador para Android (tablet ou celular).</p>
      </div>

      <a :href="APK_URL" download
        class="block w-full text-center py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-base uppercase tracking-wider">
        Baixar o aplicativo (APK)
      </a>

      <ol class="space-y-3 text-sm text-slate-300 list-decimal pl-5">
        <li>Abra o arquivo baixado. Se o Android avisar, permita <strong>"instalar apps desta fonte"</strong> para o navegador.</li>
        <li>Instale e abra o <strong>GP Totem</strong>.</li>
        <li>Na primeira vez ele pede o <strong>código de pareamento</strong>. Digite o código que o supervisor passou.</li>
        <li>Escolha <strong>em qual sensor (máquina)</strong> este aparelho vai ficar.</li>
        <li>Pronto: o aparelho fica ativado e abre direto na tela do operador.</li>
      </ol>

      <p class="text-xs text-slate-500">
        O aplicativo não traz senha dentro: só funciona depois de ativado com o código. Para trocar o sensor de um aparelho,
        use <strong>"Trocar sensor deste aparelho"</strong> na tela inicial do Totem.
      </p>
    </div>
  </div>
</template>

<script setup>
// Endereço fixo do APK mais recente (arquivo gp-totem.apk anexado à última versão no GitHub).
const APK_URL = import.meta.env.VITE_APK_URL || 'https://github.com/Davids-star/Gest-o-vista/releases/latest/download/gp-totem.apk';
</script>
