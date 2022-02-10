<template>
<div>
  <div v-for="(stim, s) in stimList"
    :key="s" class="stim">
    <trial
      v-if="currentStim === s"
      :key="s"
      :example="false"
      :stim-ref="stim.twister"
      :currently-pressed-keys = "currentlyPressedKeys"
      :needs-response = "true"
      @done="between_trials = true"
      @no-keys-pressed="nkp_error = true"
    ></trial>
    <p v-if="nkp_error && currentStim === s"><b>We did not record any keypresses from you on the last trial.</b> Please check that the provided keyboard is still plugged in, and click here before placing your fingers back on the keys.</p>
    <p v-if="between_trials && currentStim === s">Press {{advanceKeyText}} to continue.</p>
  </div>
</div>
</template>
<script>
import trial from './trial.vue'

export default {
  name: 'trialLoop',
  components: {
    trial
  },
  props: {
    stimList: Array,
    advanceKeys: Array, // keys to press in order to advance
    advanceKeyText: String,
    currentlyPressedKeys: Array
  },
  data: () => {
    return {
      currentStim: 0,
      nkp_error: false,
      between_trials: false
    }
  },
  methods: {
    nextTrial() {

      // reset variables
      this.between_trials = false;
      this.nkp_error = false;

      // continue to next stim, or emit an advance event
      if (this.currentStim < this.stimList.length - 1) {
        this.currentStim++;
      } else {
        this.$emit('advance')
      }

    },
    setsAreEqual(array1, array2) {
      let set1 = new Set(array1)
      let set2 = new Set(array2)

      // easiest to compare by size first
      if (set1.size !== set2.size) {
        return false;
      }

      return Array.from(set1).every(element => {
        return set2.has(element);
      });

    }
  },
  watch: {
    currentlyPressedKeys(newValue) {

      // check for thumb press, but only if we're between trials
      if (this.between_trials === true) {
        if (this.setsAreEqual(this.advanceKeys, newValue) === true) {

          this.nextTrial();

        }
      }

    }
  }
}

</script>
