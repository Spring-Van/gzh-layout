import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { comicDb } from '@/api/comic'
import type { ComicProject, ComicProjectType } from '@comic/types'

/**
 * Comic 模块项目 Store
 * 改造自 comic-gen-ai 的 stores/project.ts
 * 数据层从 Dexie (IndexedDB) 迁移到 Electron IPC (JSON 文件存储)
 */
export const useProjectStore = defineStore('comicProject', () => {
  const projects = ref<ComicProject[]>([])
  const currentProject = ref<ComicProject | null>(null)

  const loadProjects = async () => {
    projects.value = await comicDb.getAllProjects()
  }

  const createProject = async (
    name: string,
    projectType: ComicProjectType = 'short',
    description?: string
  ) => {
    const project: ComicProject = {
      id: uuidv4(),
      name,
      projectType,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await comicDb.saveProject(project)
    await loadProjects()
    return project
  }

  const updateProject = async (id: string, updates: Partial<ComicProject>) => {
    const existing = await comicDb.getProject(id)
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: Date.now() }
      await comicDb.saveProject(updated)
    }
    await loadProjects()
    if (currentProject.value?.id === id) {
      currentProject.value = { ...currentProject.value, ...updates, updatedAt: Date.now() }
    }
  }

  /**
   * 删除项目
   * IPC 端已实现级联删除（generationTasks + projectAssets + materials + project）
   * 此处仅清理 sessionStorage 缓存
   */
  const deleteProject = async (id: string) => {
    await comicDb.deleteProject(id)
    // 清理 sessionStorage 中与该项目相关的所有缓存
    sessionStorage.removeItem(`page-editor-original-${id}`)
    sessionStorage.removeItem(`page-editor-data-${id}`)
    sessionStorage.removeItem(`pending-gen-tasks-${id}`)
    await loadProjects()
  }

  const setCurrentProject = (project: ComicProject) => {
    currentProject.value = project
  }

  return {
    projects,
    currentProject,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject
  }
})
