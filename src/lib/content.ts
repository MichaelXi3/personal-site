import { getCollection } from "astro:content";

export async function getPosts() {
  const posts = await getCollection("blog", ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getProjects() {
  const projects = await getCollection("projects");
  return projects.sort((a, b) => a.data.order - b.data.order || b.data.year.localeCompare(a.data.year));
}

export async function getAlbums() {
  const albums = await getCollection("photos");
  return albums.sort((a, b) => b.data.date.localeCompare(a.data.date));
}

// Dates are stored at midnight UTC, so format in UTC to keep the written day.
export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
