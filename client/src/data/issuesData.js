const issues = [
  {
    title: "App Access, Login and Registration  🔥",
    details: [
      "🔥 Issues registering and accessing the app for iPhone/Safari users.",
      "🔥 Can currently create multiple accounts with the same Email.",
      "🔥 App sometimes breaks on page refresh, or if navigating to a previous page.",
      "🔥 Forgot Password feature is broken. Generic Server error message."
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  },
  {
    title: "Notifications",
    details: [
      "Notifications are not sent by the client until you refresh the page sometimes."
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  },
  {
    title: "Messenger  🔥",
    details: [
      "Chat window should auto-scroll to the last seen message, but sometimes does not.",
      "Messages are not always marked as seen correctly.",
      "🔥 The message list should load previous messages when scrolling up. This is temporarily broken.",
      "🔥 Attempting to start a conversation with someone who is not on your friends list breaks the app."
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  },
  {
    title: "Friends List  🔥",
    details: [
      "🔥 Can add the same person twice if you both send a request, and accept both requests.",
      "🔥 Can currently send a friend request to yourself."
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  },
  {
    title: "Blocking & Privacy  🔥",
    details: [
      "🔥 Blocking a user does not currently prevent them from interacting with you. They Can still view your profile as well.",
      "🔥 There is no way to unblock users yet—this will be added in profile settings."
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  },
  {
    title: "Profile & Settings Pages  🔥",
    details: [
      "🔥 Sometimes trying to access your own profile results in a 'This user has blocked you' error. Logging out and back in is a temporary work-around.",
      "🔥 Not all settings are currently functional. Known to not be working: Change Password, Theme Preference, Preferred Lang, Visibility",
      "🔥 Changing email through account settings does not currently require re-verification.",
      "Activity log entries for sharing memories aren't displaying data correctly"
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  },
  {
    title: "Likes and Shares  🔥",
    details: [
      "🔥 Some events receive multiple (seemingly x4) likes and shares on the For You page",
      "Like button does not work on the Events page but functions on Explore and Feed pages."
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  },
  {
    title: "Event & Memory Posts  🔥",
    details: [
      "Currently, users can create events with an empty title or description.",
      "Can create memory posts with an empty input as well.",
      "The magnifying glass icon is clickable on all events, but in the future, it will only be available for events exceeding the content preview limit.",
      "The modal popup for creating events is kind of small on larger viewports. Can be annoying to unintentionally close the modal by clicking outside of it.",
      "🔥 Time capsule events can be created for already passed dates.",
      "🔥 Time capsule events are not functioning correctly. You are meant to be able to share memories after creation, they are just not revealed until the reveal date.",
      "Location tracking data not accurate."
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  },
  {
    title: "Mobile UI Issues  🔥",
    details: [
      "🔥 UI is not currently designed for browsers that have the address bar on the bottom. Let me know if you spot areas where this causes issues, visually or functionally."
    ],
    lastUpdated: "2025-03-11T16:54:27.451Z"
  }
];

export default issues;