const EventEmitter = require('events');

/**
 * In-process Asynchronous Event Queue (Simulating Kafka / RabbitMQ)
 * Handles decoupled event publishing and asynchronous background subscriber execution.
 */
class EventQueue extends EventEmitter {
  constructor() {
    super();
    this.eventLog = [];
    this.pendingJobs = [];
    this.processedCount = 0;
  }

  /**
   * Publish an event asynchronously to all subscribers
   */
  publish(topic, payload) {
    const event = {
      id: 'EVT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      topic,
      payload,
      timestamp: new Date().toISOString()
    };

    this.eventLog.unshift(event);
    if (this.eventLog.length > 50) {
      this.eventLog.pop(); // keep last 50 events
    }

    console.log(`[Event Broker PUBLISH] Topic: ${topic} | Event ID: ${event.id}`);

    // Asynchronous dispatch via process.nextTick / setTimeout to simulate message queue delay
    setTimeout(() => {
      this.emit(topic, event);
      this.emit('*', event); // Wildcard listener for logging & monitoring
      this.processedCount++;
    }, 100);

    return event;
  }

  /**
   * Schedule a deferred background job (e.g. state machine progression)
   */
  scheduleJob(jobName, delayMs, jobFn) {
    const job = {
      id: 'JOB-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: jobName,
      scheduledAt: new Date().toISOString(),
      executeInMs: delayMs
    };

    this.pendingJobs.push(job);
    console.log(`[Queue SCHEDULE] Job: ${job.name} (ID: ${job.id}) in ${delayMs / 1000}s`);

    setTimeout(async () => {
      try {
        await jobFn();
        this.pendingJobs = this.pendingJobs.filter(j => j.id !== job.id);
        console.log(`[Queue EXECUTED] Job: ${job.name} (ID: ${job.id})`);
      } catch (err) {
        console.error(`[Queue ERROR] Job ${job.id} failed:`, err.message);
      }
    }, delayMs);

    return job;
  }

  /**
   * Get queue metrics for HLD architecture visualization
   */
  getStatus() {
    return {
      pendingJobsCount: this.pendingJobs.length,
      processedEventsCount: this.processedCount,
      recentEvents: this.eventLog.slice(0, 15)
    };
  }
}

module.exports = new EventQueue();
