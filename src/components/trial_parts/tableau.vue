<template>
  <div class="tableau">
    <pane
      v-for="(pane, p) in panes"
      :image="pane"
      :focused="focused_pane === p"
      :key="p"
    ></pane>
  </div>
</template>
<script>

import pane from './pane.vue'

export default {
  name: 'tableau',
  props: {
    stimRef: String
  },
  components: {
    pane
  },
  data: () => {
    return {
      focused_pane: null
    }
  },
  computed: {
    panes() {
      return this.stimRef.split(" ");
    }
  }
}

</script>
