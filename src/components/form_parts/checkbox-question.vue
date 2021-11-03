<template>
  <div class="checkboxes option-list">
    <span
      v-for="n in Array(options.length).keys()"
      v-bind:key="options[n] | regularize"
      :class = "displayedValues.includes($options.filters.regularize(options[n]))? 'selected-option' : '' "
    >
      <input type="checkbox"
        v-bind:value="options[n] | regularize"
        v-bind:checked="displayedValues.includes(options[n])"
        v-bind:id="options[n] | regularize"
        v-on:change="updateAppState"
        v-bind:disabled="unclickable === true"
      />&nbsp;
      <label
        v-bind:for="options[n] | regularize"
        v-bind:key="options[n] | regularize"
      >
      <span>{{ options[n] }}</span>
      <img v-if="exampleImgs.length > 0" class="example-img" :src="require('@/assets/'+exampleImgs[n])" />
    </label>
    </span>
  </div>
</template>

<script>

export default {
  name: 'checkbox-question',
  props: {
    groupId: null,
    atleastOne: {
      type: Boolean,
      default: false
    },
    options: {
      type: Array,
      default: function () {
        return ['wired',
                'wireless'
              ]
        }
      },
    alreadyChecked: { // which options are already checked?
      type: Array,
      default: function() {
        return []
      }
    },
    unclickable: {
      type: Boolean,
      default: false
    },
    exampleImgs: {
      type: Array,
      default: function() {
        return []
      }
    }
  },
  data: function() {
    return {
      selectedValues: []
    }
  },
  filters: {
    regularize: function (value) {
      value = value.replace(" ", "-")
      value = value.replace(".", "")

      return (value)

    }
  },
  methods: {
    updateAppState: function(newValue) {

      // add or remove value as needed
      if (newValue.target.checked === true) {
        this.selectedValues.push(newValue.target.value)
      } else {
        this.selectedValues = this.selectedValues.filter(item => item !== newValue.target.value)
      }

      this.$emit('input', this.selectedValues);

      if (this.atLeastOne === true) {
        this.$emit('error-catch', {
          'element_name': this.groupId,
          'num_errors': this.selectedValues === [] ? 1 : 0
        });
      }
    }
  },
  computed: {
    getVal: function() {
      return(this.value);
    },
    displayedValues: function() {
      if (this.alreadyChecked.length > 0 && this.selectedValues.length === 0) {
        return this.alreadyChecked
      } else {
        return this.selectedValues
      }
    }
  },
  created: function() {
  }
}
</script>
