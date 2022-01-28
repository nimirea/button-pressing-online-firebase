<template>
<div>
  <p v-for="(para, p) in paragraphs" :key="p" v-html="para"></p>

  <img v-if="image != ''" :src="require('@/assets/'+image)" />

  <tableau v-if="tableau != ''" :stim-ref="tableau"></tableau>

  <p v-if="completionCondition.sequence.length > 0" v-html="completionCondition.text"></p>
  <button v-else v-html="completionCondition.text" @click="complete"></button>

  <p v-if="error_made" v-html="'<b>' + errorMessage + '</b>'"></p>
</div>
</template>
<script>
import tableau from '../trial_parts/tableau.vue'

export default {
  name: 'instructionMod',
  props: {
    paragraphs: Array,
    image: {
      type: String,
      default: ""
    },
    tableau: {
      type: String,
      default: ""
    }, // for displaying tableau panes
    completionCondition: Object,
    errorMessage: {
      type: String,
      default: "That's not quite right! Go ahead and try again, starting from the beginning."
    },
    currentlyPressedKeys: Array
  },
  components: {
    tableau
  },
  data: () => {
    return {
      error_made: false,
      keys_pressed: []
    }
  },
  methods: {
    complete() {
      this.$emit('advance');
      this.keys_pressed = [];
    },
    arraysAreEqual(array1, array2) {
      return array1.length === array2.length && array1.every(function(value, index) { return value === array2[index]})
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
    currentlyPressedKeys(newValue, oldValue) {

        // simultaneous evaluation
        if (this.completionCondition.simultaneous === true) {

          if (this.setsAreEqual(newValue, this.completionCondition.sequence)) {
            this.complete();
          }

        // sequential evaluation
        } else {

          // add to keys pressed
          if (newValue.length != 0 && newValue.length > oldValue.length) {
            this.keys_pressed.push(newValue[0])

            // check for completeness
            // success condition
            if (this.arraysAreEqual(this.keys_pressed, this.completionCondition.sequence)) {
              this.complete();

            } else if (this.keys_pressed.length <= this.completionCondition.sequence.length && this.keys_pressed.length > 0) {

              // check for valid subsequence
              if (this.arraysAreEqual(this.keys_pressed, this.completionCondition.sequence.slice(0, this.keys_pressed.length))) {
                this.error_made = false;
              } else {
                console.log("not right")
                this.error_made = true;

                // clear keys pressed
                this.keys_pressed = [];
              }
            }
          }
        }

    }
  }
}

</script>
