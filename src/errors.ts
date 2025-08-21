export class InvalidCookies extends Error {
  constructor(message = 'The cookies provided do not provide a valid session.') {
    super(message);
    this.name = 'InvalidCookies';
  }
}

export class InvalidCookieFile extends Error {
  constructor(message = 'The cookies file provided could not be parsed for cookies.') {
    super(message);
    this.name = 'InvalidCookieFile';
  }
}

export class InvalidData extends Error {
  constructor(message = 'The data received do not fit the expected format.') {
    super(message);
    this.name = 'InvalidData';
  }
}
