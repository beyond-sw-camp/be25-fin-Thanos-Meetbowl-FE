function compareBySortOrderThenName(left, right) {
  const leftOrder =
    Number.isFinite(Number(left?.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER
  const rightOrder =
    Number.isFinite(Number(right?.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER

  if (leftOrder !== rightOrder) return leftOrder - rightOrder
  return `${left?.name || ''}`.localeCompare(`${right?.name || ''}`, 'ko')
}

function compareUsersByPositionThenName(left, right, positionSortOrderMap) {
  const leftOrder = positionSortOrderMap.get(left?.positionId) ?? Number.MAX_SAFE_INTEGER
  const rightOrder = positionSortOrderMap.get(right?.positionId) ?? Number.MAX_SAFE_INTEGER

  if (leftOrder !== rightOrder) return leftOrder - rightOrder
  return `${left?.name || ''}`.localeCompare(`${right?.name || ''}`, 'ko')
}

function createNodeKey(type, id) {
  return `${type}:${id}`
}

function normalizeDisplayValue(value, fallback = '-') {
  const normalized = `${value || ''}`.trim()
  return normalized || fallback
}

function registerNode(nodeMap, node) {
  nodeMap.set(node.key, node)
  return node
}

export function buildOrganizationFullChart({
  affiliateName = '',
  departments = [],
  teams = [],
  users = [],
  positions = [],
} = {}) {
  const positionSortOrderMap = new Map(
    positions.map((position) => [
      position.positionId,
      Number.isFinite(Number(position?.sortOrder)) ? Number(position.sortOrder) : Number.MAX_SAFE_INTEGER,
    ]),
  )

  const rootKey = createNodeKey('root', affiliateName || 'organization')
  const sortedDepartments = [...departments].sort(compareBySortOrderThenName)
  const activeTeams = teams.filter((team) => `${team?.status || ''}`.toUpperCase() === 'ACTIVE')
  const teamsByDepartmentId = new Map()
  const usersByDepartmentId = new Map()
  const nodeMap = new Map()

  for (const team of activeTeams) {
    const current = teamsByDepartmentId.get(team.departmentId) || []
    current.push(team)
    teamsByDepartmentId.set(team.departmentId, current)
  }

  for (const currentTeams of teamsByDepartmentId.values()) {
    currentTeams.sort(compareBySortOrderThenName)
  }

  for (const user of users) {
    if (!user?.departmentId) continue
    const current = usersByDepartmentId.get(user.departmentId) || []
    current.push(user)
    usersByDepartmentId.set(user.departmentId, current)
  }

  for (const currentUsers of usersByDepartmentId.values()) {
    currentUsers.sort((left, right) => compareUsersByPositionThenName(left, right, positionSortOrderMap))
  }

  const departmentNodes = sortedDepartments.map((department) => {
    const departmentKey = createNodeKey('department', department.departmentId)
    const departmentName = normalizeDisplayValue(department.name)
    const departmentTeams = teamsByDepartmentId.get(department.departmentId) || []
    const departmentUsers = usersByDepartmentId.get(department.departmentId) || []
    const teamUserMap = new Map(departmentTeams.map((team) => [team.teamId, []]))
    const unassignedUsers = []

    for (const user of departmentUsers) {
      if (user.teamId && teamUserMap.has(user.teamId)) {
        teamUserMap.get(user.teamId).push(user)
      } else {
        unassignedUsers.push(user)
      }
    }

    const teamNodes = departmentTeams.map((team) => {
      const teamKey = createNodeKey('team', team.teamId)
      const teamName = normalizeDisplayValue(team.name)
      const teamUsers = teamUserMap.get(team.teamId) || []
      const memberNodes = teamUsers.map((user) =>
        registerNode(nodeMap, {
          key: createNodeKey('member', user.userId),
          type: 'member',
          id: user.userId,
          parentKey: teamKey,
          departmentId: department.departmentId,
          teamId: team.teamId,
          name: normalizeDisplayValue(user.name),
          email: normalizeDisplayValue(user.email, ''),
          position: normalizeDisplayValue(user.position),
          departmentName,
          teamName,
          memberCount: 1,
        }),
      )

      return registerNode(nodeMap, {
        key: teamKey,
        type: 'team',
        id: team.teamId,
        parentKey: departmentKey,
        departmentId: department.departmentId,
        name: teamName,
        departmentName,
        memberCount: memberNodes.length,
        members: memberNodes,
        isVirtual: false,
      })
    })

    if (unassignedUsers.length > 0) {
      const virtualTeamKey = createNodeKey('team', `unassigned-${department.departmentId}`)
      const memberNodes = unassignedUsers.map((user) =>
        registerNode(nodeMap, {
          key: createNodeKey('member', user.userId),
          type: 'member',
          id: user.userId,
          parentKey: virtualTeamKey,
          departmentId: department.departmentId,
          teamId: '',
          name: normalizeDisplayValue(user.name),
          email: normalizeDisplayValue(user.email, ''),
          position: normalizeDisplayValue(user.position),
          departmentName,
          teamName: '미배정 팀',
          memberCount: 1,
        }),
      )

      teamNodes.push(
        registerNode(nodeMap, {
          key: virtualTeamKey,
          type: 'team',
          id: `unassigned-${department.departmentId}`,
          parentKey: departmentKey,
          departmentId: department.departmentId,
          name: '미배정 팀',
          departmentName,
          memberCount: memberNodes.length,
          members: memberNodes,
          isVirtual: true,
        }),
      )
    }

    return registerNode(nodeMap, {
      key: departmentKey,
      type: 'department',
      id: department.departmentId,
      parentKey: rootKey,
      name: departmentName,
      memberCount: departmentUsers.length,
      teams: teamNodes,
      teamCount: teamNodes.length,
      members: departmentUsers.map((user) => ({
        userId: user.userId,
        name: normalizeDisplayValue(user.name),
        position: normalizeDisplayValue(user.position),
      })),
    })
  })

  const totalTeamCount = departmentNodes.reduce((sum, department) => sum + department.teams.length, 0)
  const totalMemberCount = departmentNodes.reduce((sum, department) => sum + department.memberCount, 0)
  const rootNode = registerNode(nodeMap, {
    key: rootKey,
    type: 'root',
    id: affiliateName || 'organization',
    parentKey: '',
    name: normalizeDisplayValue(affiliateName, '전체 조직'),
    departmentCount: departmentNodes.length,
    teamCount: totalTeamCount,
    memberCount: totalMemberCount,
    departments: departmentNodes,
  })

  return {
    rootNode,
    nodeMap,
    defaultSelectedKey: '',
    isEmpty: departmentNodes.length === 0,
  }
}
