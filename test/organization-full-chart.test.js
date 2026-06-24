import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOrganizationFullChart } from '../src/lib/organization-full-chart.js'

test('organization full chart builder keeps department-team-member hierarchy and parent links', () => {
  const chart = buildOrganizationFullChart({
    affiliateName: '한화시스템',
    departments: [
      { departmentId: 'dept-b', name: '기술연구소', sortOrder: 2 },
      { departmentId: 'dept-a', name: '경영지원부', sortOrder: 1 },
    ],
    teams: [
      { teamId: 'team-2', departmentId: 'dept-a', name: '운영관리팀', sortOrder: 2, status: 'ACTIVE' },
      { teamId: 'team-1', departmentId: 'dept-a', name: '인사총무팀', sortOrder: 1, status: 'ACTIVE' },
      { teamId: 'team-3', departmentId: 'dept-b', name: 'AI연구팀', sortOrder: 1, status: 'INACTIVE' },
    ],
    users: [
      {
        userId: 'user-1',
        departmentId: 'dept-a',
        teamId: 'team-1',
        name: '전하린',
        position: '차장',
        positionId: 'position-2',
        email: 'harin@meetbowl.test',
      },
      {
        userId: 'user-2',
        departmentId: 'dept-a',
        teamId: '',
        name: '민채원',
        position: '과장',
        positionId: 'position-1',
        email: 'chaewon@meetbowl.test',
      },
    ],
    positions: [
      { positionId: 'position-1', name: '과장', sortOrder: 1 },
      { positionId: 'position-2', name: '차장', sortOrder: 2 },
    ],
  })

  assert.equal(chart.rootNode.name, '한화시스템')
  assert.equal(chart.rootNode.departmentCount, 2)
  assert.equal(chart.rootNode.teamCount, 3)
  assert.equal(chart.rootNode.memberCount, 2)
  assert.equal(chart.defaultSelectedKey, '')

  assert.deepEqual(
    chart.rootNode.departments.map((department) => department.name),
    ['경영지원부', '기술연구소'],
  )

  const departmentNode = chart.nodeMap.get('department:dept-a')
  assert.equal(departmentNode.parentKey, chart.rootNode.key)
  assert.equal(departmentNode.memberCount, 2)
  assert.equal(departmentNode.teamCount, 3)
  assert.deepEqual(
    departmentNode.teams.map((team) => team.name),
    ['인사총무팀', '운영관리팀', '미배정 팀'],
  )

  const memberNode = chart.nodeMap.get('member:user-1')
  assert.equal(memberNode.parentKey, 'team:team-1')
  assert.equal(memberNode.departmentName, '경영지원부')
  assert.equal(memberNode.teamName, '인사총무팀')

  const unassignedTeamNode = chart.nodeMap.get('team:unassigned-dept-a')
  assert.equal(unassignedTeamNode.isVirtual, true)
  assert.equal(unassignedTeamNode.memberCount, 1)
  assert.equal(unassignedTeamNode.members[0].name, '민채원')
})

test('organization full chart builder falls back to a generic root label when affiliate name is missing', () => {
  const chart = buildOrganizationFullChart({
    departments: [],
    teams: [],
    users: [],
    positions: [],
  })

  assert.equal(chart.rootNode.name, '전체 조직')
  assert.equal(chart.isEmpty, true)
  assert.equal(chart.nodeMap.get(chart.rootNode.key).type, 'root')
})
