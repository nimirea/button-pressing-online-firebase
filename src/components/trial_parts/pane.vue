<template>
  <img :src="require('@/assets/stimuli-img/'+image+'.png')" class="pane" :class="{ 'on-beat': focused }"/>
</template>
<script>

export default {
  name: 'pane',
  props: {
    focused: Boolean,
    image: String
  }
}

</script>
