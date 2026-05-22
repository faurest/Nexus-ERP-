// Offline sync and retry queues
export const syncQueue = {
  add(task: any) {
    console.log("Task added to offline sync queue", task);
  },
  process() {
    console.log("Processing sync queue");
  }
};
