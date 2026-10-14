import { describe, expect, it } from 'vitest'
import { parsePageRanges, RangeValidationError } from './ranges'

describe('page range parser', () => {
  it.each([
    ['1-3', [1, 2, 3]],
    ['2,5,7-9', [2, 5, 7, 8, 9]],
    ['5,2-3', [5, 2, 3]],
    [' 1 - 3 , 6 ', [1, 2, 3, 6]],
    ['2-2', [2]],
    ['01, 03 - 04', [1, 3, 4]],
  ])('preserves selection order for %s', (input, expected) => {
    expect(parsePageRanges(input, 9, 'extract').pages).toEqual(expected)
  })

  it('normalizes spaces and singleton ranges without reordering', () => {
    expect(parsePageRanges(' 5 - 5 , 2 - 3 ', 6, 'files')).toEqual({ groups: [{ label: '5', pages: [5] }, { label: '2-3', pages: [2, 3] }], pages: [5, 2, 3], normalized: '5,2-3' })
  })

  it.each([
    ['', 'Enter pages'], ['   ', 'Enter pages'], ['1,', 'Group 2 is empty'], [',1', 'Group 1 is empty'],
    ['1,,2', 'Group 2 is empty'], ['1,1', 'Page 1 is selected more than once'], ['1-3,3-5', 'Page 3 is selected more than once'],
    ['0', 'Page numbers start at 1'], ['0-2', 'Page numbers start at 1'], ['-1', 'positive whole page numbers'],
    ['3-1', 'descending'], ['7', 'outside this 6-page PDF'], ['1-7', 'outside this 6-page PDF'],
    ['1.5', 'positive whole page numbers'], ['1;2', 'positive whole page numbers'], ['one', 'positive whole page numbers'],
    ['1-2-3', 'positive whole page numbers'], ['1 2', 'positive whole page numbers'], ['+2', 'positive whole page numbers'],
    ['1e2', 'positive whole page numbers'], ['999999999999999999999', 'too large'],
  ])('rejects %j with an actionable error', (input, expected) => {
    expect(() => parsePageRanges(input, 6, 'extract')).toThrow(expected)
    expect(() => parsePageRanges(input, 6, 'files')).toThrow(RangeValidationError)
  })

  it('limits separate output groups to 30 while allowing longer single extractions', () => {
    const thirty = Array.from({ length: 30 }, (_, index) => index + 1).join(',')
    expect(parsePageRanges(thirty, 40, 'files').groups).toHaveLength(30)
    expect(() => parsePageRanges(`${thirty},31`, 40, 'files')).toThrow('at most 30')
    expect(parsePageRanges(`${thirty},31`, 40, 'extract').pages).toHaveLength(31)
  })

  it.each([0, -1, 1.5, NaN])('requires a valid source count (%s)', (count) => {
    expect(() => parsePageRanges('1', count, 'extract')).toThrow('at least one page')
  })
})
