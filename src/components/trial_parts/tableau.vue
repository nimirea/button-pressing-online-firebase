<template>
  <div class="tableau">
    <pane
      v-for="(pane, p) in panes"
      :image="pane"
      :focused="focusedPane === p"
      :key="p"
    ></pane>
  </div>
</template>
<script>

import pane from './pane.vue'

export default {
  name: 'tableau',
  props: {
    stimRef: String, // which stimulus to display, in abbreviated notation
    focusedPane: { // watched property
      type: Number,
      default: null
    }
  },
  components: {
    pane
  },
  computed: {
    panes() {
      return this.stimRef.split(" ");
    }
  }
}

</script>
