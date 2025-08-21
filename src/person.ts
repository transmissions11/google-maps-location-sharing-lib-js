import { InvalidData } from './errors';
import type { Person } from './types';

export function parsePerson(data: any[]): Person {
  try {
    const id = data[6]?.[0] ?? null;
    const pictureUrl = data[6]?.[1] ?? null;
    const fullName = data[6]?.[2] ?? null;
    const nickname = data[6]?.[3] ?? null;
    const latitude = data[1]?.[1]?.[2] ?? null;
    const longitude = data[1]?.[1]?.[1] ?? null;
    const timestamp = data[1]?.[2] ?? null;
    const accuracy = data[1]?.[3] ?? null;
    const address = data[1]?.[4] ?? null;
    const countryCode = data[1]?.[6] ?? null;
    const charging = Boolean(data[13]?.[0] ?? null);
    const batteryLevel = data[13]?.[1] ?? null;

    const datetime = (() => {
      if (timestamp == null) return null;
      const millis = Math.floor(Number(timestamp));
      if (!Number.isFinite(millis)) return null;
      return new Date(millis);
    })();

    return {
      id: id ?? fullName ?? null,
      pictureUrl,
      fullName,
      nickname,
      latitude,
      longitude,
      timestamp,
      accuracy,
      address,
      countryCode,
      charging,
      batteryLevel,
      datetime,
    };
  } catch (e) {
    throw new InvalidData('Invalid person data array');
  }
}

export function personToString(person: Person): string {
  const lines = [
    `Full name        :${person.fullName}`,
    `Nickname         :${person.nickname}`,
    `Current location :${person.address}`,
    `Latitude         :${person.latitude}`,
    `Longitude        :${person.longitude}`,
    `Datetime         :${person.datetime?.toISOString?.() ?? ''}`,
    `Charging         :${person.charging}`,
    `Battery %        :${person.batteryLevel}`,
    `Accuracy         :${person.accuracy}`,
  ];
  return lines.join('\n');
}
