<template>
<div>
  <div v-for="(stim, s) in stimList"
    :key="s" class="stim">
    <trial
      v-if="currentStim === s && (!between_trials || !refresher )"
      :key="s"
      :example="false"
      :stim-ref="stim.twister"
      :currently-pressed-keys = "currentlyPressedKeys"
      :needs-response = "true"
      @done="endTrial"
      @no-keys-pressed="nkp_error = true"
    ></trial>
  </div>
  <div class="stim">
    <instruction-mod
      v-if="between_trials && refresher && !refresher_done"
      :paragraphs = "['This is just a quick refresher: please press the keys in this pane in order.']"
      :completion-condition = "generateCompletionCondition(random_pane)"
      :tableau = "generateTableauObj(random_pane)"
      :currently-pressed-keys = "currentlyPressedKeys"
      :error-message = "'Not quite! Remember, the order is red, then blue, then gray.'"
      @advance="endRefresher"
      class="refresher"
    ></instruction-mod>
    <!-- fixation cross: this is here so that we don't restart the trial over again -->
    <img v-if="between_trials && refresher_done" :src="require('@/assets/fixcross.png')" alt="Fixation cross" class="fixcross"/>
  </div>
  <div class="after-stim" v-if="between_trials && (!refresher || refresher_done)">
    <p v-if="refresher_done">Great job! Your progress is {{ 100.0 * (currentStim + 1) / stimList.length}}%.</p>
    <p v-if="nkp_error && !refresher"><b>We did not record any keypresses from you on the last trial.</b> Please check that the provided keyboard is still plugged in, and click here before placing your fingers back on the keys.</p>
    <p>Press {{advanceKeyText}} to continue.</p>
  </div>

</div>
</template>
<script>
import trial from './trial.vue'
import instructionMod from '../instruction_parts/instruction_module.vue'

export default {
  name: 'trialLoop',
  components: {
    trial,
    instructionMod
  },
  props: {
    stimList: Array,
    advanceKeys: Array, // keys to press in order to advance
    advanceKeyText: String,
    currentlyPressedKeys: Array,
    refresherFreq: Number,
    fingersToKeys: Object,
    keyAbbrevs: Object
  },
  data: () => {
    return {
      currentStim: 0,
      nkp_error: false,
      between_trials: false,
      refresher_done: false,
      random_pane: null
    }
  },
  methods: {
    endRefresher() {
      this.refresher_done = true;
    },
    mapToKey(finger) {
      return this.$props.fingersToKeys[finger]
    },
    endTrial(payload) {
      this.between_trials = true;

      // trigger upload to server
      this.$emit('upload', {
        'trial_number': this.currentStim,
        'trial_data': payload
      })

      return;
    },
    nextTrial() {

      // reset variables
      this.between_trials = false;
      this.nkp_error = false;
      this.refresher_done = false;

      // continue to next stim, or emit an advance event
      if (this.currentStim < this.stimList.length - 1) {
        this.currentStim++;
        this.random_pane = this.stimList[this.currentStim].twister.split(' ')[this.getRandomBetween(0, 2)];
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

    },
    generateCompletionCondition(stim) {
      // this function should work for single-pane as well as multi-pane stims

      let panes = stim.split(" ")
      let result = []
      panes.map((pane) => {
        for (let index = 0; index < pane.length; index += 2) {
          result.push(pane.slice(index, index + 2))
        }
      })

      let vm = this;
      result = result.map((key_abbreviation) => {
        //return key_abbreviation[1] + " " + key_abbreviation[0];
        return vm.mapToKey([
          vm.keyAbbrevs[key_abbreviation[1]]
          + " "
          + vm.keyAbbrevs[key_abbreviation[0]]
        ]);
      })

      return {
        sequence: result,
        simultaneous: false,
        text: ''
      }


    },
    generateTableauObj(stim) {
      return {
        stimRef: stim,
        playable: false
      }
    },
    getRandomBetween(minimum, maximum){
      return Math.floor(Math.random() * maximum) + minimum
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
  },
  computed: {
    refresher: function() { // whether current trial is a "refresher" trial or not
      return ((this.currentStim + 1) % this.refresherFreq === 0
        && this.currentStim >= this.refresherFreq - 1
        && this.random_pane !== null
        && this.currentStim < this.stimList.length - 1)
    }
  }
}

</script>
