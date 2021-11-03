<template>
  <loading-view v-if="uploading === true"></loading-view>
  <div v-else-if="!surveyComplete">
    <h1>Screening Survey</h1>

    <h2>Demographics</h2>

    <p>What is your native language?</p>
    <radio-button-question
      v-model="survey_answers.native_lang"
      group-id="native_lang"
      @error-catch="updateFormErrors"
      :labels="['English', 'other']"
    ></radio-button-question>

    <p>Do you have any history of speech, language, hearing, and/or sleep disorder?</p>
    <radio-button-question
      v-model="survey_answers.disorder"
      group-id="disorder"
      @error-catch="updateFormErrors"
      :labels="['Yes', 'No']"
    ></radio-button-question>

    <p>Are you 18 years of age or older?</p>
    <radio-button-question
      v-model="survey_answers.age18orolder"
      group-id="age18orolder"
      @error-catch="updateFormErrors"
      :labels="['Yes', 'No']"
    ></radio-button-question>

    <h2>Equipment</h2>

    <p>What type(s) of headphones do you have access to? (check all that apply)</p>
    <checkbox-question
      group-id="headphones"
      v-model="survey_answers.headphones"
    ></checkbox-question>

    <p>Do you have access to a desktop or laptop computer?</p>
    <radio-button-question
      v-model="survey_answers.computer"
      group-id="computer"
    ></radio-button-question>

    <p>Which of the following ports do you have on your computer(s)? (check all that apply)</p>
    <checkbox-question
      v-model="survey_answers.ports"
      group-id="ports"
      :options="['USB Type A (most common USB port)', 'USB Type C (MacBook)']"
      :exampleImgs="[
        'usb-a.jpeg',
        'usb-c.jpeg'
      ]"
    ></checkbox-question>

    <h2>Availability</h2>

    <p>If you choose to take part in our study, you will be asked to log into our online experiment at the same time every day for 2 weekdays in a row, for 1 hour each day (up to $30 total compensation). For example, if you choose to start the study at 10am on June 22, you will also be asked to log in on June 23 at 10am:</p>

    <img src="../assets/calendar.png" />

    <p><b>Can you be available for 1 hour at the same time of day, for two weekdays in a row, starting within the next month?</b></p>

    <radio-button-question
      v-model="survey_answers.available"
      group-id="available"
      @error-catch="updateFormErrors"
      :labels="['Yes', 'No']"
    ></radio-button-question>

    <h2>Contact</h2>
    <textbox-question
      v-model="survey_answers.email"
      @error-catch="updateFormErrors"
      question-text="Please provide your email address, so we can contact you if you are eligible:"
      text-type="email"
    ></textbox-question>

    <p>(If you are not eligible, your email address will not be stored.)</p>

    <button v-on:click="submitSurvey" v-if="perfectFormState === true">
      submit survey
    </button>
    <button v-else class="unclickable">
      please answer all questions to continue
    </button>
  </div>
  <div v-else>
    <div v-if="returned_data.is_eligible && returned_data.waiting_list === false">
      <h1>Congratulations!</h1>
      <p>You are eligible to participate in our study.</p>
      <p>You should receive an email with a link to our consent form and instructions on how to pick up and drop off your equipment on campus. If you have not received this email in one hour, please contact the research team at <a href="mailto:multinight.study@gmail.com">multinight.study@gmail.com</a>.</p>
    </div>
    <div v-else-if="returned_data.is_eligible && returned_data.waiting_list === true">
      <h1>You're eligible, but the study is full right now</h1>
      <p>You are eligible to participate in our study, but we do not have any open timeslots right now. We will email you when more spots open up!</p>
    </div>
    <div v-else>
      <h1>Thank you for your response</h1>
      <p>You are not eligible to participate in our study at this time.</p>
    </div>
  </div>
</template>
<script>
import { fb_functions } from "../fb_init.js"

import textboxQuestion from './form_parts/textbox-question.vue'
import radioButtonQuestion from './form_parts/radio-button-question.vue'
import checkboxQuestion from './form_parts/checkbox-question.vue'
import loadingView from './loading-view.vue'

export default {
  name: 'eligibility-survey',
  props: ['firebase'],
  components: {
    radioButtonQuestion,
    checkboxQuestion,
    textboxQuestion,
    loadingView
  },
  data: function() {
    return {
      survey_answers: {},
      perfectFormState: false,
      errorCounts: [],
      surveyComplete: false,
      returned_data: {},
      uploading: false
    }
  },
  methods: {
    updateFormErrors: function(namedErrors) {

      // store data
      this.errorCounts[namedErrors['element_name']] = namedErrors['num_errors']

      // check for completeness, for fields that should be complete
      if (
        this.survey_answers.email == null ||
        this.survey_answers.available == null ||
        this.survey_answers.age18orolder == null ||
        this.survey_answers.native_lang == null ||
        this.survey_answers.disorder == null ||
        this.survey_answers.keyboard_letters == null ||
        this.survey_answers.keyboard_numbers == null
      ) {
        this.perfectFormState = false
      } else {
        // set perfectFormState based on this
        var errorSum = Object.values(this.errorCounts).reduce((a,b) => a + b);
        this.perfectFormState = (errorSum === 0);
      }
    },
    submitSurvey: function() {

      this.uploading = true
      let self = this;

      // upload to server
      var submitData = fb_functions.httpsCallable('submitData');

      submitData(this.survey_answers).then((res) => {
        self.uploading = false
        if (res.data !== null) {
          self.returned_data = res.data;
          self.surveyComplete = true;
        } else {
          self.perfectFormState = false;
        }
      });
    }
  },
  created: function() {
  }
}

</script>
