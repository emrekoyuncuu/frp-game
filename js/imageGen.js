const ImageGen = {
  BASE_URL: 'https://image.pollinations.ai/prompt/',

  generate(prompt, width = 512, height = 512) {
    const full = `${prompt}, fantasy art, highly detailed, dark atmosphere, digital painting, cinematic lighting`;
    return `${this.BASE_URL}${encodeURIComponent(full)}?width=${width}&height=${height}&nologo=true`;
  },

  portrait(raceId, classId) {
    const race = RACES.find(r => r.id === raceId)?.name || raceId;
    const cls  = CLASSES.find(c => c.id === classId)?.name || classId;
    return this.generate(
      `portrait of a ${race} ${cls} character, fantasy RPG, face close-up, dramatic lighting`,
      256, 256
    );
  },

  scene(prompt) {
    return this.generate(prompt, 768, 432);
  }
};
