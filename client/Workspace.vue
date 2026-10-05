<script setup>
import { ref, onMounted } from "vue";
import { api, act } from "./api";
const date = ref(new Date(Date.now() + 86400000).toISOString().slice(0, 10)),
  slots = ref([]),
  rows = ref([]),
  name = ref("Deniz Yardımcı");
async function load() {
  const r = await api("/slots?date=" + date.value);
  slots.value = r.slots;
  rows.value = await api("/appointments");
}
onMounted(() => act(load, ""));
</script>
<template>
  <div class="grid">
    <section class="panel">
      <h2>Randevu seç</h2>
      <p class="muted">
        Tek uzman · 09:00-17:00 · 30 dakika · Europe/Istanbul (UTC+03:00)
      </p>
      <label>Ad soyad<input v-model="name" required /></label
      ><label
        >Gün<input type="date" v-model="date" @change="act(load, '')"
      /></label>
      <div class="grid three">
        <button
          v-for="s in slots"
          :disabled="!s.available"
          @click="
            act(async () => {
              await api('/appointments', 'POST', { date, slot: s.time, name });
              await load();
            }, 'Randevu alındı')
          "
        >
          {{ s.time }} · {{ s.available ? "Uygun" : "Dolu" }}
        </button>
      </div>
    </section>
    <section class="panel">
      <h2>Randevularım</h2>
      <div class="card" v-for="r in rows">
        <h3>{{ r.date }} / {{ r.slot }}</h3>
        <p>{{ r.name }} · {{ r.status }}</p>
        <button
          v-if="r.status === 'booked'"
          class="ghost"
          @click="
            act(async () => {
              await api('/appointments/' + r.id, 'DELETE');
              await load();
            }, 'İptal edildi')
          "
        >
          İptal et
        </button>
      </div>
      <p v-if="!rows.length" class="empty">Henüz randevun yok.</p>
    </section>
  </div>
</template>
