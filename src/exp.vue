<template>
  <div id="app" v-cloak>

    <!-- check for outdated browser -->
    <div v-if="browserOutdated">
      <h1>Unsupported browser</h1>
      <p>It appears you are using an unsupported browser. Please open this page in Edge, Firefox, or Chrome to continue.</p>
    </div>

    <!-- check if the day value is a valid value -->
    <div v-else-if="day > 4 || Number.isNaN(day) || day < 1">
      <h1>Invalid URL</h1>
      <p>Are you sure that you're in the right place? Please make sure you've clicked the correct link, and send a message to your experimenter if the issue persists.</p>
    </div>

    <!-- check if participants CAN continue to the next day -->
    <div v-else-if="prevDayIncomplete & day != 1">
      <h1>Previous day not completed</h1>
      <p>You must complete all sessions in order. If you completed Day {{ day - 1 }} already, please send a message to your experimenter.</p>
    </div>

    <div v-else-if="alreadyDone">
      <h1>Already completed this session</h1>
      <p>You have already completed this session. Did you click on the previous day's link?</p>
    </div>

    <div v-else-if="timingCorrect == 'early'">
      <h1>Too early</h1>
      <p v-if="timingCorrect == 'early'">Please refresh this page in {{ timeRemainingString }}.</p>
    </div>

    <div v-else-if="timingCorrect === 'just right'">

    <p class="recording-bar" v-if="isRecording">recording</p>

    <!-- keyboard check -->
    <div v-if="!expOver & taskList[currentTask].name == 'equipment_setup'">
      <h1>Task {{currentTask + 1}} of {{taskList.length}}: Equipment Setup</h1>

      <p>
        Welcome! In this part of the session, we'll be setting up your equipment
        for the experiment.
      </p>

      <p>
        Important: please DO <b>NOT</b> use the back button or
        refresh the study at any point during this experiment—you will lose your
        place!
      </p>

      <p>You will need headphones for this experiment. Please connect them now,
        and make sure you are in a quiet place where you won't be disturbed for
        about 1 hour. You will also need a flat desk surface large enough for
        your external keyboard.
      </p>

        <button
          v-on:click="taskList[currentTask].data.headphonesConnected = true;"
          v-bind:class="{
                          active: taskList[currentTask].data.headphonesConnected === true
                        }"
        >My headphones are connected, and I am in a quiet place with a suitable surface.</button>

      <div v-if="taskList[currentTask].data.headphonesConnected == true">

        <p>At this time, please connect the external keyboard you were given to
          your computer's USB port, and <b>turn it upside-down</b>, so that
          the row of removed keys is closest to you, and the space bar is facing <em>away</em> from you, like so:</p>

        <img src="./assets/keyboard-no-hands.jpeg" />

        <button
          v-on:click="taskList[currentTask].data.keyboardConnected = true; startKeyTrial();"
          v-bind:class="{
                          active: taskList[currentTask].data.keyboardConnected === true
                        }"
        >The external keyboard is connected and upside-down.</button>

      </div>

      <div v-if="taskList[currentTask].data.keyboardConnected == true">

        <p>Please put your thumbs and all fingers except your pinkies on the keys that are covered with stickers,
          as shown:</p>

        <img src="./assets/keyboard-hands.jpeg" />

        <p>When you are ready, please press the key beneath your <b>{{ keyTrial.key.finger }}</b>.</p>

        <p v-if="keyTrial.result === 'failed'">That's not quite right! Please readjust your hands according to the picture and try again.</p>
        <div v-if="keyTrial.result === 'passed'">
          <p>Awesome! Let's try another.</p>
        </div>

      </div>

    </div>

    <!-- main experiment flow (tongue-twisters) -->
    <div v-if="!expOver && taskList[currentTask].name == 'TT'">
      <div v-if="!isStarted">
        <h1>Task {{currentTask + 1}} of {{taskList.length}}: Tongue-Twister Task</h1>
        <p>
          We will now ask you to read some tongue-twisters to the beat of a
          metronome. First,  you will hear a low "get ready" beep, then a tongue twister
          will appear on the screen with a higher "get set" beep. On the next beep after
          the tongue-twister appears, please begin
          reading the tongue-twister aloud, one word per beat. After four beats (1
          repetition of the tongue-twister), the metronome will speed up for the next
          3 repetitions. Click the button below to hear/see
          an example trial for the tongue-twister "ghib ting pin hid":
        </p>
        <button v-on:click="sampleTrial(0)" v-bind:class="{ unclickable: taskList[currentTask].sample_trials[0].isPlaying }">&#9658; play example</button>
        <div class="example-trial">
          <div class="stim">
            <p v-if="taskList[currentTask].sample_trials[0].isPlaying && stimVisible">ghib ting pin hid</p>
            <p v-else>
              <img src="./assets/fixcross.png" alt="Fixation cross" class="fixcross"/>
            </p>
            <button class="invisible"></button>
          </div>
        </div>

        <p>Important notes:</p>

        <ul>
          <li>
            Please do your best to keep up with the metronome! If you make a
            mistake, DO <b>NOT</b> go back to correct yourself.
          </li>
          <li>
            Please perform this task <b>with your headphones on</b>. You can replay the example trial above and adjust your
            volume to make sure you can comfortably hear the metronome.
          </li>
        </ul>

        <div v-if="day === 1">

          <p>Here's another example; try saying this tongue-twister aloud at the same time as the sample speaker. (This practice trial will not be stored.)</p>

          <button v-on:click="sampleTrial(1, true)" v-bind:class="{ unclickable: taskList[currentTask].sample_trials[1].isPlaying }">
            <span class="rec-symbols">&#x25cf;</span> record practice trial
          </button>
          <div class="example-trial">
            <div class="stim">
              <p v-if="taskList[currentTask].sample_trials[1].isPlaying && stimVisible">bap nak tam gad</p>
              <p v-else>
                <img src="./assets/fixcross.png" alt="Fixation cross" class="fixcross"/>
              </p>
              <button class="invisible"></button>
            </div>
          </div>

          <div v-if="taskList[currentTask].sample_trials[1].played === true && taskList[currentTask].sample_trials[1].completed === false">
            <p>Sorry, we didn't hear you that time. Please try recording the practice trial again.</p>
          </div>
          <div v-else-if="taskList[currentTask].sample_trials[1].played === true && taskList[currentTask].sample_trials[1].completed === true">
            <p>Looks like you're ready to continue!</p>
          </div>

        </div>

        <div v-if="day > 1 || (taskList[currentTask].sample_trials[1].played === true && taskList[currentTask].sample_trials[1].completed === true)">
          <p>
            This task should last approximately {{ stimList.length * .25 }}
            minutes. Your recordings will be stored and uploaded for analysis.
          </p>
          <button v-on:click="startTask">start experiment (recording will begin automatically)</button>
        </div>
      </div>

      <div v-if="isStarted" class="stim">
        <p v-if="!trialEnded && stimVisible">
            {{ stimList[currentStim]['twister'] }}
        </p>
        <p v-else>
          <img src="./assets/fixcross.png" alt="Fixation cross" class="fixcross"/>
        </p>
        <button v-on:click="nextTrial" v-if="trialEnded">next</button>
        <button v-else class="invisible"></button>
      </div>
    </div>

    <!--post-task survey-->
    <div v-if="taskList[currentTask].name == 'survey' && expOver === false">
    <h1>Task {{currentTask + 1}} of {{taskList.length}}: Post-Task Survey</h1>
    <post-task-survey
      :ppt-id='participant_id'
      :day='day'
      @submit='stopTask'>
    </post-task-survey>
    </div>

    <!-- experiment over -->
    <div v-if="expOver">
      <p>Your response has been successfully submitted!</p>
      <p v-if="day != 2">You will receive an email shortly with a link to tomorrow's session. Please click the link after {{ timeRemainingString }}, and be sure to get a full night's sleep (while wearing your Fitbit) before your next session.</p>
      <p v-else>Thank you for your participation in this experiment! We look forward to seeing you at your equipment drop-off appointment.</p>
    </div>
  </div>
  </div>
</template>

<script>
// import eligibilitySurvey from './components/eligibility-survey.vue'
// import consentForm from './components/consent-form.vue'
// import booking from './components/booking.vue'
// import textboxQuestion from './components/form_parts/textbox-question.vue'
import postTaskSurvey from './components/posttask-survey.vue'

// Initialize Cloud Functions through Firebase
import { fb_functions } from "./fb_init.js"

// vendor libraries
import Papa from 'papaparse';
import Pizzicato from 'pizzicato';

export default {
  name: 'ExperimentSession',
  data: function() {
    return {
      stream: {},
      snd: {}, // sound to be played
      analyserNode: {}, // volume meter
      fingerMapping: {
        'left thumb': "7",
        'right thumb': "6",
        'left index finger': "j",
        'right index finger': "f",
        'left middle finger': ",",
        'right middle finger': "x",
        'left ring finger': ".",
        'right ring finger': "z"
      },
      isStarted: false, // has the experiment started?
      isRecording: false, // are we currently recording?
      stimList: [{'twister': ''}], // list of stimuli for TT task
      currentStim: 0, // keep track of which stimulus should be shown
      isi: 1000, // interstimulus interval, in ms
      stimVisible: false,
      rejected: false, // declined to participate
      trialEnded: false, // TT task
      expOver: false,
      taskList: [ // tasks, in order
        {
          name: 'equipment_setup',
          data: {
            headphonesConnected: null,
            keyboardConnected: null
          }
        },
        {
          name: 'TT'
        },
        {
          name: 'survey'
        }
      ], // task info, in order of appearance
      currentTask: 0, // keeps track of which task is active
      recordingDDK: false, // whether DDK task is recording
      participant_id: null,
      exp_cond: null, // experiment condition (onset, coda-onset, or coda-coda)
      cb_cond: null, // counterbalancing condition
      exp_length: null, // experiment length, will depend on URL parameter
      surveySubmitted: false, // whether ending survey has been submitted or not
      surveyData: { }, // data for the survey at the end
      stq: { }, // sleep timing questionnaire
      perfectFormState: false, // checking whether the survey is valid
      errorCounts: { }, // for storing errors for each input
      audioPermission: { // data for the survey at the beginning
        'presentation': false,
        'public': false
      },
      test_mode: null, // whether to use a smaller stimulus list ('yes' = use smaller)
      timeRemainingString: null,
      minsRemaining: null,
      timingCorrect: null, // whether the timing is correct or not (set based on minsRemaining, possible values are early, just right)
      prevDayIncomplete: false, // did the participant complete the previous day?
      alreadyDone: false, // did the participant already complete THIS day?
      browserOutdated: false,
      completionURL: null,
      completionErrors: false,
      speechRecorded: false,
      lastKey: {
        key: null,
        timestamp: null
      },
      keyTrial: {
        start: null, // when did the keytrial start?
        key: null,
        result: null
      }
    }
  },
  components: {
    postTaskSurvey
  },
  methods : {
    shuffle: function (array) {
      // Knuth shuffle (in-place)
      // from: https://stackoverflow.com/a/2450976

      var currentIndex = array.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    },
    getRandomKey: function() {
      let fingers = Object.keys(this.fingerMapping);
      let rand_idx = Math.floor(Math.random() * fingers.length);

      let result = {
        'finger': fingers[rand_idx],
        'key': this.fingerMapping[fingers[rand_idx]]
      }

      return result;
    },
    keyFunction: function(keypress_event) {
      // what happens when a key is pressed?
      this.lastKey.key = keypress_event.key;
      this.lastKey.timestamp = new Date();

      // if a keyTrial is happening:
      if (this.keyTrial.key != null) {
        if (this.lastKey.key === this.keyTrial.key.key) {
          this.keyTrial.result = "passed"
        } else {
          this.keyTrial.result = "failed"
        }
      }

      console.log(this.keyTrial.result);

    },
    startKeyTrial: function() {
      this.keyTrial.key = this.getRandomKey();
      this.keyTrial.start = new Date();
    },
    uploadData: fb_functions.httpsCallable('uploadData'),
    // function that starts the experiment
    startTask: function(){

        // upload timestamp
        this.uploadData({
          'participant_id': 'ppt/' + this.participant_id,
          'day': this.day,
          'timestamp_name': 'startedTime'
        })

        // run first trial
        this.runTrial();


    },

    // stop task and continue to next one (or end the experiment, if we're all out of tasks)
    stopTask: function() {


      // end the whole experiment if we're all out of tasks
      if (this.currentTask == this.taskList.length - 1) {

        this.updateTimeRemaining(this.day, () => {
          this.expOver = true; // update view
        });

      } else {
        // advance to next task
        this.currentTask += 1;

        // scroll to top
        window.scrollTo(0, 0);
      }
    },

    updateFormErrors: function(namedErrors) {
      // store data
      this.errorCounts[namedErrors['element_name']] = namedErrors['num_errors']

      // set perfectFormState based on this
      var errorSum = Object.values(this.errorCounts).reduce((a,b) => a + b);
      this.perfectFormState = (errorSum === 0 &&
        (Object.keys(this.stq).length === 18 || this.day > 1)
      );
    },

    // function that advances to next trial
    nextTrial: function() {
      // begin start of next trial (hide continue button)
      this.trialEnded = false;

      // advance stimulus
      this.currentStim += 1;

      // trial flow
      this.runTrial();
    },

    // function that runs the trial
			runTrial: function(){
      // import metronome sound (4 slow + 12 fast beats) as an object
				this.snd = new Pizzicato.Sound(
					{
						source:'file',
						options: {
							path: '/static/metronome.mp3',
							loop: false
						}
					},

        // when sound is loaded...
					() => {
          // set what to do after the sound ends
          this.snd.on("end", () => setTimeout(() => {
            this.stopRecording();

            // go to next item, if it exists
            if (this.currentStim < this.stimList.length - 1) {

              // show continue button
              this.trialEnded = true;

              // hide stimulus in next trial
              this.stimVisible = false;

            } else {
              this.stopTask();
            }
          }, this.isi));

          setTimeout(() => {
            this.stimVisible = true;
          }, this.isi );

          this.snd.play();

        }
				);
			},

    // play sample trial
    sampleTrial: function(trial_idx, try_along = false) {
      if (!this.taskList[this.currentTask].sample_trials[trial_idx].isPlaying) {
        var sampleSound = new Pizzicato.Sound(
            {
              source:'file',
              options: {
                path: '/static/metronome.mp3',
                loop: false
              }
            },

          // when sound is loaded, go through the trial flow
							() => {
            // reset the frame when the sound ends
            sampleSound.on("end", () => {
              this.stopRecording(false);
              this.stimVisible = false;
              this.taskList[this.currentTask].sample_trials[trial_idx].isPlaying = false;
              this.taskList[this.currentTask].sample_trials[trial_idx].played = true;

              if (try_along === true) {
                this.taskList[this.currentTask].sample_trials[trial_idx].completed = this.speechRecorded;
              }

            })

            this.taskList[this.currentTask].sample_trials[trial_idx].isPlaying = true;

            setTimeout(() => {
              this.stimVisible = true;
            }, this.isi);

            if (try_along === true) {
              this.record(true, true);
            }

            sampleSound.play();

          }
						);

      }
    },

    // push survey data and end the survey
    submitSurvey: function() {
      // data to push
      let push_data = {
        'participant_id': this.participant_id,
        'day': this.day,
        'surveyData': this.surveyData
      }
      // push stq if this is day 1
      if (this.day === 1) {
        push_data.ksq = this.ksq
      }

      this.uploadData(push_data)
      .then(() => {
        // update view
        this.stopTask();
      });


    },

    // calculate time remaining (update timeRemainingString and minsRemaining)
    // d = previous day
    // usually, you will want to do something with timeRemainingString / minsRemaining afterwards, so we have a callback
    updateTimeRemaining: function(d, _callback = () => { return null }) {

      var gct = fb_functions.httpsCallable('getStartTime');
      gct({
        participant_id: this.participant_id,
        day: d
      })
      .then((res) => {

        var lastTimestamp = res.data;

        if (lastTimestamp === null) {
          this.minsRemaining = 0
        } else {
          this.minsRemaining = 1440 - Math.floor((new Date().getTime() - lastTimestamp)/(1000*60));
        }

        var roundedHours = Math.floor(this.minsRemaining / 60)

        this.timeRemainingString = roundedHours + " hours";

        if (roundedHours * 60 < this.minsRemaining) {
          this.timeRemainingString = this.timeRemainingString + " and " + (this.minsRemaining - roundedHours * 60) + " minutes";
        }

      }).then(() => {
        _callback();
      });
    }


  },
  created: function(){

    // check if user is using IE
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");
    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv:11\./)) {
      this.browserOutdated = true;
    }

    if (this.browserOutdated === false) {

      // add event listener
      let v = this;
      window.addEventListener('keydown', (e) => {
        v.keyFunction(e);
      });

      // getting participant ID from URL
      var urlParams = new URLSearchParams(window.location.search);
      this.participant_id = urlParams.get('ppt');
      if (this.participant_id !== null) {
        this.participant_id = this.participant_id.replaceAll(".", "|")
      }

      this.test_mode = (urlParams.get('TEST_MODE') === 'yes');
      this.clockPosition = urlParams.get('clock_position');
      this.day = Number(urlParams.get('day'));

      // determine whether participant has arrived at the right time,
      // based on whether they've
      var ccs = fb_functions.httpsCallable('calcCompletionStatus');
        ccs({
          'participant_id': this.participant_id,
          'day': this.day
        }).then((res) => {

          if (this.test_mode === true && res.data === null) {
            this.prevDayIncomplete = false;
            this.alreadyDone = false;
          } else {
            this.prevDayIncomplete = res.data.prevDayIncomplete;
            this.alreadyDone = res.data.alreadyDone;
          }

          if (this.alreadyDone === false) {
            if (this.day != 1) {

              this.updateTimeRemaining(this.day - 1, () => {

                // update timingCorrect dynamically
                if (this.minsRemaining > 0) {
                  this.timingCorrect = "early";
                } else {
                  this.timingCorrect = "just right";
                }

              });

            } else {
              this.timingCorrect = "just right";
            }
          }

        })

      // set experimental & counterbalancing conditions
      var gpc = fb_functions.httpsCallable('getPptData');
      gpc({
        ppt_id: 'ppt/' + this.participant_id,
        attribute: ['exp_cond', 'cb_cond'],
        set_if_null: true,
        add_to_db: this.test_mode
      }).then((res) => {

          this.exp_cond = res.data.exp_cond;
          this.cb_cond = res.data.cb_cond;

          // get stimuli from CSV file
          var stim_file = '/static/stimuli.csv'
          if (this.test_mode) {
            stim_file = '/static/stimuli-small.csv';
          }

          fetch(stim_file)
            .then(response => response.text())
            .then(data => {
              this.stimList = Papa.parse(data, {
                  'header': true,
                  'skipEmptyLines': true,
                  'columns': ['stim_id', 'cb_cond', 'exp_cond', 'twister']
              }).data;

              // filter by day and conditions:

              // retrive experimental condition for this day
              var exp_cond_today = this.exp_cond.split("-")[Math.round((this.day) / 2) - 1];
              this.stimList = this.stimList.filter(item => {

                return (item.exp_cond == exp_cond_today
                        && item.cb_cond == this.cb_cond)

              });

              // randomize stimulus list
              this.shuffle(this.stimList);

              if (this.day % 2 === 1) {
                // Day 1 & 3: pick half at random
                this.stimList = this.stimList.slice(0, this.stimList.length / 2)
                return(this.stimList);

              } else {

                // Day 2 & 4: pick whichever words weren't already picked yesterday
                var gs = fb_functions.httpsCallable('getStims');
                return gs({
                  participant_id: this.participant_id,
                  day: this.day - 1
                }).then((res) => {
                  let prev_stim_ids = res.data;

                  // console.log(prev_stim_ids);

                  if (prev_stim_ids === null) {
                    console.log("Sorry! Not enough data to create stimulus list.");
                    this.stimList = null;

                    // remove experimental task from taskList
                    this.taskList = this.taskList.filter(item => item.name != "TT");


                  } else {
                    this.stimList = this.stimList.filter(item => {
                        return !(prev_stim_ids.includes(item.stim_id));
                      });

                    return (this.stimList);

                    // console.log(this.stimList);
                  }

                });

              }

            }).then((stims_to_upload) => {

              // upload stimulus list to database
              this.uploadData({
                'participant_id': 'ppt/' + this.participant_id,
                'day': this.day,
                'stimList': stims_to_upload
              });

            })

        });
    }
  }
}

</script>

<style src="./assets/style.css"></style>
